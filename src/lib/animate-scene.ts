export const ANIMATE_SCENE_PY = `# manim -pql scene.py InvestoScene
from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path

from manim import *

BG = "#050506"
TONE_UP = "#3cb371"
TONE_DOWN = "#ff4500"
INK = "#f4f4f5"
MUTED = "#a1a1aa"
MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()


def parse_day(value: str) -> datetime:
    return datetime.fromisoformat(value[:10])


def month_year(value: str) -> str:
    if len(value) < 7:
        return value
    month = int(value[5:7])
    return f"{MONTHS[month - 1]} {value[2:4]}"


class InvestoScene(Scene):
    def construct(self):
        self.camera.background_color = BG
        data = json.loads(Path(__file__).with_name("data.json").read_text(encoding="utf-8"))
        ticker = str(data["ticker"])
        name = str(data["name"])
        last = float(data["last"])
        intrinsic = float(data["intrinsic"])
        upside = float(data["upsidePct"])
        model = str(data["modelLabel"])
        as_of = str(data["asOf"])
        raw = [
            (str(row["date"]), float(row["close"]))
            for row in (data.get("prices") or [])
            if row.get("date") and row.get("close") is not None
        ]
        if raw:
            end = parse_day(raw[-1][0])
            cut = end - timedelta(days=365)
            year = [row for row in raw if parse_day(row[0]) >= cut]
            raw = year if len(year) >= 2 else raw
        if len(raw) > 96:
            last_i = len(raw) - 1
            raw = [raw[round(i / 95 * last_i)] for i in range(96)]
        points = [(i, close) for i, (_, close) in enumerate(raw)]
        if not points:
            points = [(0, last)]
            raw = [("", last)]

        first_p, last_p = points[0][1], points[-1][1]
        if last_p > first_p:
            stroke = TONE_UP
        elif last_p < first_p:
            stroke = TONE_DOWN
        else:
            stroke = INK

        mark = Text("Investo", font_size=28, color=TONE_UP, weight=BOLD)
        title = Text(ticker, font_size=72, color=INK, weight=BOLD)
        sub = Text(name, font_size=28, color=MUTED)
        meta = Text(f"{model}  ·  {as_of}", font_size=20, color=MUTED)
        head = VGroup(mark, title, sub, meta).arrange(DOWN, aligned_edge=LEFT, buff=0.16)
        head.to_edge(UL, buff=0.65)

        self.play(FadeIn(mark, shift=DOWN * 0.12), run_time=0.55)
        self.play(FadeIn(title, shift=UP * 0.08), FadeIn(sub), run_time=0.75)
        self.play(FadeIn(meta), run_time=0.35)
        self.wait(0.55)

        ys = [p[1] for p in points] + [intrinsic, last]
        lo, hi = min(ys), max(ys)
        pad = (hi - lo) * 0.18 or 1.0
        y0, y1 = lo - pad, hi + pad
        x_max = max(points[-1][0], 1)
        axes = Axes(
            x_range=[0, x_max, x_max],
            y_range=[y0, y1, (y1 - y0) / 4],
            x_length=11.2,
            y_length=5.1,
            tips=False,
            axis_config={
                "color": MUTED,
                "stroke_width": 1.2,
                "stroke_opacity": 0.22,
                "include_ticks": False,
                "include_tip": False,
                "include_numbers": False,
            },
        )
        axes.to_edge(DOWN, buff=0.8)

        grid = VGroup()
        for k in range(1, 5):
            yy = y0 + k * (y1 - y0) / 5
            grid.add(
                DashedLine(
                    axes.c2p(0, yy),
                    axes.c2p(x_max, yy),
                    color=MUTED,
                    dash_length=0.12,
                    stroke_width=1,
                    stroke_opacity=0.22,
                )
            )
        for k in range(1, 5):
            xx = k * x_max / 5
            grid.add(
                DashedLine(
                    axes.c2p(xx, y0),
                    axes.c2p(xx, y1),
                    color=MUTED,
                    dash_length=0.12,
                    stroke_width=1,
                    stroke_opacity=0.22,
                )
            )

        area_pts = [axes.c2p(points[0][0], y0)]
        area_pts.extend(axes.c2p(x, y) for x, y in points)
        area_pts.append(axes.c2p(points[-1][0], y0))
        area = Polygon(*area_pts, stroke_width=0, fill_color=stroke, fill_opacity=0.28)
        graph = axes.plot_line_graph(
            x_values=[p[0] for p in points],
            y_values=[p[1] for p in points],
            line_color=stroke,
            add_vertex_dots=False,
            stroke_width=3.2,
        )["line_graph"]
        last_dot = Dot(axes.c2p(points[-1][0], points[-1][1]), color=stroke, radius=0.055)
        last_tag = Text(f"{last:.2f} RON", font_size=22, color=INK).next_to(last_dot, UR, buff=0.12)

        start_lbl = Text(month_year(raw[0][0]), font_size=16, color=MUTED)
        end_lbl = Text(month_year(raw[-1][0]), font_size=16, color=MUTED)
        start_lbl.next_to(axes.c2p(0, y0), DOWN, buff=0.18)
        end_lbl.next_to(axes.c2p(x_max, y0), DOWN, buff=0.18)
        range_tag = Text("1Y", font_size=16, color=MUTED).next_to(axes, UP, buff=0.12).align_to(axes, RIGHT)

        self.play(head.animate.scale(0.7).to_edge(UL, buff=0.5), FadeIn(axes), FadeIn(grid), FadeIn(range_tag), run_time=0.85)
        self.play(FadeIn(area), Create(graph), run_time=2.5)
        self.play(FadeIn(last_dot), FadeIn(last_tag), FadeIn(start_lbl), FadeIn(end_lbl), run_time=0.4)
        self.wait(0.35)

        left = axes.c2p(0, intrinsic)
        right = axes.c2p(x_max, intrinsic)
        intrinsic_line = DashedLine(left, right, color=INK, dash_length=0.14, stroke_width=2)
        int_tag = Text(f"Intrinsic  {intrinsic:.2f}", font_size=20, color=INK)
        int_tag.next_to(intrinsic_line, UP, buff=0.1).align_to(intrinsic_line, LEFT).shift(RIGHT * 0.18)

        gap = Line(
            axes.c2p(points[-1][0], points[-1][1]),
            axes.c2p(points[-1][0], intrinsic),
            color=stroke,
            stroke_width=2,
        )
        sign = "+" if upside >= 0 else ""
        gap_tag = Text(f"{sign}{upside:.1f}% vs close", font_size=22, color=stroke)
        gap_tag.next_to(gap, RIGHT, buff=0.14)

        self.play(Create(intrinsic_line), FadeIn(int_tag), run_time=0.8)
        self.play(Create(gap), FadeIn(gap_tag, shift=RIGHT * 0.08), run_time=0.7)
        self.wait(1.5)
`;

export const ANIMATE_BOOK_SCENE_PY = `# manim -pql scene.py BookScene
from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path

from manim import *

BG = "#050506"
TONE_UP = "#3cb371"
TONE_DOWN = "#ff4500"
INK = "#f4f4f5"
MUTED = "#a1a1aa"
MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()


def parse_day(value: str) -> datetime:
    return datetime.fromisoformat(value[:10])


def month_year(value: str) -> str:
    if len(value) < 7:
        return value
    month = int(value[5:7])
    return f"{MONTHS[month - 1]} {value[2:4]}"


def ron(n: float) -> str:
    sign = "-" if n < 0 else ""
    whole, frac = f"{abs(n):.2f}".split(".")
    parts: list[str] = []
    while whole:
        parts.append(whole[-3:])
        whole = whole[:-3]
    return f"{sign}{'.'.join(reversed(parts))},{frac}"


def signed_pct(n: float) -> str:
    sign = "+" if n >= 0 else ""
    return f"{sign}{n:.1f}%"


class BookScene(Scene):
    def construct(self):
        self.camera.background_color = BG
        data = json.loads(Path(__file__).with_name("data.json").read_text(encoding="utf-8"))
        value = float(data["value"])
        cost = float(data["cost"])
        pnl_pct = float(data["pnlPct"])
        day_pct = float(data["dayPct"])
        count = int(float(data.get("names") or 0))
        noun = "name" if count == 1 else "names"
        raw = [
            (str(row["date"]), float(row["close"]))
            for row in (data.get("prices") or [])
            if row.get("date") and row.get("close") is not None
        ]
        if raw:
            end = parse_day(raw[-1][0])
            cut = end - timedelta(days=365)
            year = [row for row in raw if parse_day(row[0]) >= cut]
            raw = year if len(year) >= 2 else raw
        if len(raw) > 96:
            last_i = len(raw) - 1
            raw = [raw[round(i / 95 * last_i)] for i in range(96)]
        points = [(i, close) for i, (_, close) in enumerate(raw)]
        if not points:
            points = [(0, value)]
            raw = [("", value)]

        first_p, last_p = points[0][1], points[-1][1]
        if last_p > first_p:
            stroke = TONE_UP
        elif last_p < first_p:
            stroke = TONE_DOWN
        else:
            stroke = INK
        if pnl_pct > 0:
            gap_color = TONE_UP
        elif pnl_pct < 0:
            gap_color = TONE_DOWN
        else:
            gap_color = INK

        mark = Text("Investo", font_size=28, color=TONE_UP, weight=BOLD)
        title = Text("Your book", font_size=72, color=INK, weight=BOLD)
        sub = Text(f"{count} {noun} · BVB", font_size=28, color=MUTED)
        meta = Text(f"{signed_pct(day_pct)} day", font_size=20, color=MUTED)
        head = VGroup(mark, title, sub, meta).arrange(DOWN, aligned_edge=LEFT, buff=0.16)
        head.to_edge(UL, buff=0.65)

        holds = VGroup()
        for row in (data.get("top") or [])[:3]:
            ticker = str(row.get("ticker") or "")
            if not ticker:
                continue
            pct = float(row.get("pnlPct") or 0)
            if pct > 0:
                tone = TONE_UP
            elif pct < 0:
                tone = TONE_DOWN
            else:
                tone = INK
            block = VGroup(
                Text(ticker, font_size=22, color=INK, weight=BOLD),
                Text(signed_pct(pct), font_size=20, color=tone),
            ).arrange(DOWN, aligned_edge=LEFT, buff=0.06)
            holds.add(block)
        if len(holds) > 0:
            holds.arrange(RIGHT, buff=0.42, aligned_edge=DOWN)
            holds.to_edge(UR, buff=0.65)

        self.play(FadeIn(mark, shift=DOWN * 0.12), run_time=0.55)
        self.play(FadeIn(title, shift=UP * 0.08), FadeIn(sub), run_time=0.75)
        self.play(FadeIn(meta), run_time=0.35)
        self.wait(0.55)

        ys = [p[1] for p in points] + [cost, value]
        lo, hi = min(ys), max(ys)
        pad = (hi - lo) * 0.18 or 1.0
        y0, y1 = lo - pad, hi + pad
        x_max = max(points[-1][0], 1)
        axes = Axes(
            x_range=[0, x_max, x_max],
            y_range=[y0, y1, (y1 - y0) / 4],
            x_length=11.2,
            y_length=5.1,
            tips=False,
            axis_config={
                "color": MUTED,
                "stroke_width": 1.2,
                "stroke_opacity": 0.22,
                "include_ticks": False,
                "include_tip": False,
                "include_numbers": False,
            },
        )
        axes.to_edge(DOWN, buff=0.8)

        grid = VGroup()
        for k in range(1, 5):
            yy = y0 + k * (y1 - y0) / 5
            grid.add(
                DashedLine(
                    axes.c2p(0, yy),
                    axes.c2p(x_max, yy),
                    color=MUTED,
                    dash_length=0.12,
                    stroke_width=1,
                    stroke_opacity=0.22,
                )
            )
        for k in range(1, 5):
            xx = k * x_max / 5
            grid.add(
                DashedLine(
                    axes.c2p(xx, y0),
                    axes.c2p(xx, y1),
                    color=MUTED,
                    dash_length=0.12,
                    stroke_width=1,
                    stroke_opacity=0.22,
                )
            )

        area_pts = [axes.c2p(points[0][0], y0)]
        area_pts.extend(axes.c2p(x, y) for x, y in points)
        area_pts.append(axes.c2p(points[-1][0], y0))
        area = Polygon(*area_pts, stroke_width=0, fill_color=stroke, fill_opacity=0.28)
        graph = axes.plot_line_graph(
            x_values=[p[0] for p in points],
            y_values=[p[1] for p in points],
            line_color=stroke,
            add_vertex_dots=False,
            stroke_width=3.2,
        )["line_graph"]
        last_dot = Dot(axes.c2p(points[-1][0], points[-1][1]), color=stroke, radius=0.055)
        last_tag = Text(f"{ron(points[-1][1])} RON", font_size=22, color=INK).next_to(last_dot, UR, buff=0.12)

        start_lbl = Text(month_year(raw[0][0]), font_size=16, color=MUTED)
        end_lbl = Text(month_year(raw[-1][0]), font_size=16, color=MUTED)
        start_lbl.next_to(axes.c2p(0, y0), DOWN, buff=0.18)
        end_lbl.next_to(axes.c2p(x_max, y0), DOWN, buff=0.18)
        range_tag = Text("1Y", font_size=16, color=MUTED).next_to(axes, UP, buff=0.12).align_to(axes, RIGHT)

        self.play(head.animate.scale(0.7).to_edge(UL, buff=0.5), FadeIn(axes), FadeIn(grid), FadeIn(range_tag), run_time=0.85)
        self.play(FadeIn(area), Create(graph), run_time=2.5)
        self.play(FadeIn(last_dot), FadeIn(last_tag), FadeIn(start_lbl), FadeIn(end_lbl), run_time=0.4)
        self.wait(0.35)

        left = axes.c2p(0, cost)
        right = axes.c2p(x_max, cost)
        cost_line = DashedLine(left, right, color=INK, dash_length=0.14, stroke_width=2)
        cost_tag = Text(f"Cost  {ron(cost)}", font_size=20, color=INK)
        cost_tag.next_to(cost_line, UP, buff=0.1).align_to(cost_line, LEFT).shift(RIGHT * 0.18)

        gap = Line(
            axes.c2p(points[-1][0], points[-1][1]),
            axes.c2p(points[-1][0], cost),
            color=gap_color,
            stroke_width=2,
        )
        gap_tag = Text(f"{signed_pct(pnl_pct)} vs cost", font_size=22, color=gap_color)
        gap_tag.next_to(gap, RIGHT, buff=0.14)

        self.play(Create(cost_line), FadeIn(cost_tag), FadeIn(holds), run_time=0.8)
        self.play(Create(gap), FadeIn(gap_tag, shift=RIGHT * 0.08), run_time=0.7)
        self.wait(1.5)
`;
