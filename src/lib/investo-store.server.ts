import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { appEnv, env } from "./env.server";

const DEFAULT_ROOT = "D:\\Git\\investo-ro";

export function investoRoRoot(): string {
  return env("INVESTO_RO_ROOT") ?? DEFAULT_ROOT;
}

function posixKey(relativePath: string): string {
  const prefix = (env("AWS_S3_PREFIX") ?? "").replace(/^\/+|\/+$/g, "");
  const rel = relativePath.replaceAll("\\", "/").replace(/^\/+/, "");
  return prefix ? `${prefix}/${rel}` : rel;
}

function localPath(relativePath: string): string {
  return path.join(investoRoRoot(), ...relativePath.split("/"));
}

let client: S3Client | null = null;

function s3(): S3Client {
  if (client) return client;
  const endpoint = env("AWS_ENDPOINT_URL");
  const region = env("AWS_DEFAULT_REGION") ?? "ams";
  const accessKeyId = env("AWS_ACCESS_KEY_ID");
  const secretAccessKey = env("AWS_SECRET_ACCESS_KEY");
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("ENV=prod requires AWS_ENDPOINT_URL, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY");
  }
  client = new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
  return client;
}

const CACHE_MS = 60_000;
const jsonCache = new Map<string, { at: number; value: unknown | null }>();

async function readText(relativePath: string): Promise<string | null> {
  if (appEnv() !== "prod") {
    try {
      return await readFile(localPath(relativePath), "utf8");
    } catch {
      return null;
    }
  }
  const bucket = env("AWS_S3_BUCKET_NAME");
  if (!bucket) throw new Error("ENV=prod requires AWS_S3_BUCKET_NAME");
  const key = posixKey(relativePath);
  try {
    const res = await s3().send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
    return (await res.Body?.transformToString()) ?? null;
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name !== "NoSuchKey" && name !== "NotFound") {
      console.error(`S3 read failed for ${key}: ${name || "unknown error"}`);
    }
    return null;
  }
}

export async function readJsonObject<T>(relativePath: string): Promise<T | null> {
  if (appEnv() === "prod") {
    const hit = jsonCache.get(relativePath);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.value as T | null;
  }
  const text = await readText(relativePath);
  if (!text) {
    if (appEnv() === "prod") jsonCache.set(relativePath, { at: Date.now(), value: null });
    return null;
  }
  try {
    const value = JSON.parse(text) as T;
    if (appEnv() === "prod") jsonCache.set(relativePath, { at: Date.now(), value });
    return value;
  } catch {
    return null;
  }
}
