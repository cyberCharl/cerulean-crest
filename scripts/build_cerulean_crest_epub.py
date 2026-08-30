#!/usr/bin/env python3
"""Build the 25 August 2026 Cerulean Crest EPUB.

The edition's Markdown is treated as editorial source material. Full source text is
embedded only for works with an explicit open licence; the other entries contain
original reader briefs and canonical links.
"""

from __future__ import annotations

import html
import os
import re
import shutil
import subprocess
import tempfile
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "epub_assets"
EDITION_SOURCE = ROOT / "editions" / "cerulean_crest_2026-08-25.md"
GRINDSLOP_SOURCE = ROOT / "test.html"
OUTPUT = ROOT / "deliverables" / "cerulean_crest_2026-08-25.epub"

USER_AGENT = "Cerulean-Crest-EPUB-Builder/1.0 (personal reading edition)"
PAPER_URL = "https://pmc.ncbi.nlm.nih.gov/articles/PMC13264035/"
PAPER_EFETCH = (
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
    "?db=pmc&id=13264035&retmode=xml"
)
PAPER_IMAGE_BASE = (
    "https://ars.els-cdn.com/content/image/"
    "1-s2.0-S258900422601641X-{name}.jpg"
)


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def run(*args: str, cwd: Path | None = None) -> None:
    subprocess.run(args, cwd=cwd, check=True)


def margin_note(text: str) -> str:
    return (
        '<div class="editorial-note"><p>'
        '<span class="editorial-label">Editor’s margin.</span> '
        f"{text}</p></div>"
    )


def source_link(url: str, label: str = "Read the original at source") -> str:
    return (
        f'<p class="read-source"><a href="{html.escape(url, quote=True)}">'
        f"{html.escape(label)} →</a></p>"
    )


def article_header(item: dict[str, str]) -> str:
    body = item["body"]
    if body == "__GRINDSLOP__":
        status_class = "original"
        status_text = "Original article"
    elif body == "__PAPER__":
        status_class = "original"
        status_text = "Original article · Selected sections"
    elif body == "__IEA__":
        status_class = "original"
        status_text = "Original source · Edited extract"
    else:
        status_class = "summary"
        status_text = "Editorial summary"
    return f"""
<h2>{html.escape(item['title'])}</h2>
<p class="article-subhead">{html.escape(item['byline'])}</p>
<div class="content-status content-status-{status_class}"><p>{status_text}</p></div>
<p class="reading-meta">{html.escape(item['meta'])}</p>
{margin_note(item['margin'])}
"""


def plain_text(fragment: str) -> str:
    """Reduce the small HTML fragments used in the Markdown to plain text."""
    return html.unescape(re.sub(r"<[^>]+>", "", fragment)).strip()


def parse_edition_source() -> dict[str, object]:
    """Read edition metadata and editor's notes from the saved Markdown."""
    source = EDITION_SOURCE.read_text(encoding="utf-8")
    title_match = re.search(r"^# ([^\n]+)$", source, flags=re.MULTILINE)
    date_match = re.search(r"^## ([^\n]+)$", source, flags=re.MULTILINE)
    summary_match = re.search(r"^\*\*(\d+ items[^\n]+)\*\*$", source, flags=re.MULTILINE)
    editor_match = re.search(
        r"^### Editor's note\s*\n\s*<small>(.*?)</small>",
        source,
        flags=re.MULTILINE | re.DOTALL,
    )
    if not all([title_match, date_match, summary_match, editor_match]):
        raise ValueError(f"Could not parse edition header from {EDITION_SOURCE}")

    article_matches = list(
        re.finditer(r"^## (\d+)\. ([^\n]+)$", source, flags=re.MULTILINE)
    )
    items: list[dict[str, str]] = []
    for index, match in enumerate(article_matches):
        end = article_matches[index + 1].start() if index + 1 < len(article_matches) else len(source)
        block = source[match.end():end]
        section_matches = re.findall(r"^# ([^\n]+)$", source[:match.start()], flags=re.MULTILINE)
        if not section_matches:
            raise ValueError(f"No section heading found for item {match.group(1)}")

        byline_match = re.search(r"^\*\*([^*\n]+)\*\*\s*$", block, flags=re.MULTILINE)
        reading_match = re.search(
            r"^\*\*(?:Estimated reading time|Duration):\*\*\s*([^\n]+)$",
            block,
            flags=re.MULTILINE,
        )
        type_match = re.search(r"^\*\*Type:\*\*\s*([^\n]+)$", block, flags=re.MULTILINE)
        url_match = re.search(
            r"^\*\*(?:DOI / canonical link|Canonical link):\*\*\s*(\S+)",
            block,
            flags=re.MULTILINE,
        )
        note_match = re.search(r"<small>(.*?)</small>", block, flags=re.DOTALL)
        if not all([byline_match, reading_match, type_match, url_match, note_match]):
            raise ValueError(f"Could not parse item {match.group(1)} from {EDITION_SOURCE}")

        note = plain_text(note_match.group(1))
        note = re.sub(r"^Editor's note:\s*", "", note)
        items.append(
            {
                "number": match.group(1),
                "section": section_matches[-1],
                "title": match.group(2).strip(),
                "byline": byline_match.group(1).strip(),
                "meta": " · ".join(
                    [reading_match.group(1).strip(), type_match.group(1).strip()]
                ),
                "url": url_match.group(1).strip(),
                "margin": note,
            }
        )

    return {
        "title": title_match.group(1).strip(),
        "date": date_match.group(1).strip(),
        "summary": summary_match.group(1).strip(),
        "editor_note": plain_text(editor_match.group(1)),
        "items": items,
    }


def build_grindslop_html() -> str:
    """Extract the article and its local media from the user-supplied reading copy."""
    source = GRINDSLOP_SOURCE.read_text(encoding="utf-8")
    hero_match = re.search(
        r'(<figure class="hero">.*?</figure>)', source, flags=re.DOTALL
    )
    article_match = re.search(r"<article>(.*?)</article>", source, flags=re.DOTALL)
    if not hero_match or not article_match:
        raise ValueError(f"Could not extract article content from {GRINDSLOP_SOURCE}")
    article = re.sub(r'\sloading="lazy"', "", article_match.group(1))
    hero = re.sub(r'\sloading="lazy"', "", hero_match.group(1))
    return f"""
<div class="grindslop-article">
{hero}
{article}
</div>
"""


def build_paper_html(work: Path) -> str:
    xml_path = work / "paper.xml"
    raw_html_path = work / "paper-raw.html"
    xml_path.write_bytes(fetch(PAPER_EFETCH))

    run(
        "pandoc",
        "-f",
        "jats",
        "-t",
        "html5",
        str(xml_path),
        "-o",
        str(raw_html_path),
    )
    converted = raw_html_path.read_text(encoding="utf-8")

    introduction_start = converted.index('<h1 id="sec1">')
    introduction_end = converted.index('<h1 id="sec2">')
    main_text = converted[introduction_start:introduction_end]

    # Include a standalone Conclusion/Conclusions section when the source has
    # one. This article ends with Discussion instead, so no long substitute is
    # silently introduced.
    conclusion_match = re.search(
        r'<h1\b[^>]*>\s*Conclusions?\s*</h1>', converted, flags=re.IGNORECASE
    )
    if conclusion_match:
        next_heading = re.search(r"<h1\b", converted[conclusion_match.end():])
        conclusion_end = (
            conclusion_match.end() + next_heading.start()
            if next_heading
            else len(converted)
        )
        main_text += converted[conclusion_match.start():conclusion_end]

    # The EPUB article heading is H2; keep the paper's own hierarchy beneath it.
    main_text = re.sub(
        r"<h([123])([^>]*)>",
        lambda match: f"<h{int(match.group(1)) + 2}{match.group(2)}>",
        main_text,
    )
    main_text = re.sub(
        r"</h([123])>",
        lambda match: f"</h{int(match.group(1)) + 2}>",
        main_text,
    )

    # The reference list and STAR Methods are intentionally left at the source,
    # so internal JATS links would otherwise be dead in this reading extract.
    main_text = re.sub(
        r'<a\b(?=[^>]*\bhref="#[^"]+")[^>]*>(.*?)</a>',
        r"\1",
        main_text,
        flags=re.DOTALL,
    )
    main_text = re.sub(
        r'<span\b(?=[^>]*\bclass="citation")[^>]*>.*?</span>',
        "",
        main_text,
        flags=re.DOTALL,
    )
    main_text = main_text.replace("<sup>,</sup>", "")

    for name in ["ga1", "gr1"]:
        (work / f"{name}.jpg").write_bytes(fetch(PAPER_IMAGE_BASE.format(name=name)))

    return f"""
<p class="paper-authors">Milan de Korte, Joris Bergman, L. Gerard van
Willigenburg, Victor Lobanov, Alyssa Joyce, Xiaodong Cheng &amp; Karel J.
Keesman · <em>iScience</em> 29(6), 116266 · 8 June 2026</p>
<div class="licence-note"><p><strong>Included under CC BY 4.0.</strong>
This reading version contains the article’s Summary, Highlights and Introduction.
The source has no standalone Conclusion section; Results, Discussion, STAR Methods,
references and supplementary files remain at the source. Formatting and heading
levels were adapted for EPUB; the scientific text was not rewritten.</p></div>
<h3>Summary</h3>
<p>In integrated aqua-agriculture, matching waste-derived nutrient supply with
crop demand while maintaining optimal fish and crop conditions remains
challenging. We formulate a closed-loop aquaculture-hydroponics network with
anaerobic digestion as a constrained optimal-control problem and combine static
sizing with climate-driven dynamic flow optimization for contrasting climates.
Under weak seasonality (Jakarta), internal wastes (aquaculture water, fish sludge,
and plant residues) support discharge-free operation with water, nitrogen, and
phosphorus use-efficiencies of 100%, 79%, and 72%. As seasonality increases
(Cairo, Amsterdam), feasibility and robustness decline due to shifting demand and
limited phosphorus recoverability. Using manure as co-digestion substrate
restores closed-cycle operation without synthetic fertilizers. The optimizer
prefers pig manure in Cairo and chicken manure in Amsterdam, reflecting
climate-specific N:P deficits. Relative to climate-matched decoupled aquaponics,
optimized integrated networks cut water, nitrogen, and phosphorus waste by 86%,
46%, and 35%. Overall, the framework enables climate-robust design of circular
aqua-agriculture networks, reducing resource use and pollution.</p>
<h3>Highlights</h3>
<ul>
  <li>Integrating anaerobic digestion enables circular industrial aqua-agriculture.</li>
  <li>Internal waste allows discharge- and fertilizer-free operation in tropical climates.</li>
  <li>Increasing seasonality reduces both water and phosphorus loop closure.</li>
  <li>Co-digestion restores loop closure with a climate-dependent optimal manure type.</li>
</ul>
<p><img src="ga1.jpg" alt="Graphical abstract for the industrial aqua-agriculture network" /></p>
{main_text}
<div class="licence-note"><p>Source: de Korte, M. et al. (2026),
“Climate dependent feasibility of closing water and nutrient cycles in industrial
aqua-agriculture,” <em>iScience</em>, DOI 10.1016/j.isci.2026.116266.
© 2026 the authors. <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.</p></div>
"""


IEA_BODY = """
<div class="licence-note"><p><strong>Included under CC BY 4.0.</strong>
This substantial reading extract is adapted from the IEA’s online “Grids” chapter.
Web navigation and chart controls were removed, the online table was shortened,
and a small amount of connective wording was condensed for focused reading.</p></div>
<h3>Grids are emerging as a bottleneck for connecting supply, demand and storage</h3>
<p>A lack of grid capacity is emerging as a critical bottleneck in many regions,
driving higher levels of congestion and slowing the deployment of new electricity
generation, storage and demand. Grid connection queues have reached record levels
worldwide.</p>
<p>In response, this year’s report examines the range of measures that regulators
and system operators are adopting to “move fast and connect things”: enabling more
capacity to be integrated more quickly through regulatory reforms and deployment
of technologies that can deliver rapid grid upgrades.</p>
<p>Greater demand-side participation and the expansion of utility-scale battery
storage are additional levers for enhancing system flexibility and managing
congestion, which are addressed in the subsequent chapter on Flexibility.</p>
<p>This chapter on grids also includes a dedicated section on the synchronisation
of the Baltic power system in February 2025, a landmark technical and political
achievement.</p>
<h3>Grid technologies and regulatory reforms unlock grid capacity</h3>
<p>Accelerating the build out of grids is a key imperative as the new era of
electricity evolves around the world. Over 2 500 GW of renewable, large-load and
storage projects are currently stalled in grid queues worldwide. With grid
investment lagging far behind that for generation projects, many power systems
already face rising congestion-related curtailment.</p>
<p>Meeting electricity demand through 2030 will require annual grid investment to
increase by approximately 50% by 2030 from today’s USD 400 billion, alongside a
scale-up in grid supply chains and more effective management of workforce
challenges.</p>
<p>The urgency becomes especially apparent given the mismatch in the time required
to plan and build new grids compared to generation projects or data centres.
Planning, permitting and completing new grid infrastructure can take anywhere from
5 to 15 years, whereas new builds on the supply and demand side are much faster at
1–5 years for renewables projects such as solar PV and wind, 1–3 years for data
centres, and 1–2 years for EV charging infrastructure. At the same time, prices for
key grid components have nearly doubled over the past five years.</p>
<p>While ramping up investment in the construction of new grids is crucial and
needs to accelerate, significant additional hosting capacity can be unlocked in
the near term by using existing grids more efficiently. This is especially
relevant, as grids are built to serve peak demand, but often have substantial
unused capacity during non-peak periods.</p>
<p>Complementary measures, such as grid-enhancing technologies and regulatory
adjustments, can unlock near-term grid capacity, delivering net system-wide
economic benefits. Together, they could free enough hosting capacity to connect
between 1 200–1 600 GW of advanced-stage projects currently stuck in queues
worldwide.</p>
<p>About 750–900 GW could be enabled through conditional non-firm connection
agreements, with the remainder unlocked by grid-enhancing solutions such as
dynamic line rating, advanced power-flow control, and various other options, as
well as more extensive upgrades such as reconductoring and voltage uprating.</p>
<p>A non-firm connection agreement is an arrangement between a system operator and
the grid user (such as a generator, consumer, or storage facility) that typically
enables faster grid access, but with the condition that the user’s output or
consumption may be limited at certain times. This built-in flexibility helps
unlock additional hosting capacity by allowing more assets to connect before
major grid reinforcements are completed.</p>
<p>Beyond non-firm connections, standard congestion-management tools and robust
regulatory frameworks that support the co-location of multiple power plants and
battery energy storage systems at a single connection point can further ease grid
constraints. By enabling several assets to share existing infrastructure, these
measures help bring more projects into operation in a timely manner.</p>
<p>In parallel, grid capacity auctions, stricter requirements for obtaining and
retaining grid capacity, and faster processing of connection requests can
contribute to more effective management of grid connection queues. These
mechanisms help ensure that scarce capacity is allocated efficiently, prioritising
the highest-value and most deliverable projects while reallocating capacity from
projects unlikely to proceed.</p>
<p>In addition to targeted regulatory and policy measures, unlocking the full
potential of today’s power networks will increasingly depend on the deployment of
advanced grid-enhancing technologies. These solutions can increase grid
flexibility, ensure greater reliability and help reduce overall investment costs
by relieving different types of binding operational constraints and improving
utilisation of existing assets.</p>
<p>Grid-enhancing technologies such as dynamic line rating (DLR), dynamic
transformer rating (DTR), advanced power flow control (APFC), topology optimisation
(TO), and storage as a transmission asset (SATA) will also play a key role in
expanding existing capacity. In addition, more substantial upgrades to grid
systems such as reconductoring and voltage uprating can significantly increase the
capacity of existing transmission infrastructure.</p>
<h3>Grid-enhancing technology unlocks capacity at relatively low cost</h3>
<p>Alongside updating regulatory frameworks, significant grid capacity can also be
unlocked in the near term by applying grid-enhancing technologies. Upgrades like
reconductoring and voltage uprating can significantly increase the capacity of
existing infrastructure. These solutions can enhance grid flexibility, ensure
greater reliability and help reduce overall investment costs.</p>
<p>The IEA estimates that the implementation and rollout of these grid technology
solutions globally could unlock sufficient capacity to connect 450–700 GW of
projects at advanced stages in connection queues, assuming all other factors
remain unchanged.</p>
<p>Most of the technology solutions described below can be deployed with relatively
short lead times, replacing traditional grid investments or serving as temporary
measures aligning short-term needs with long-term grid planning. Capacity benefits
cannot be stacked additively because several solutions address the same thermal,
voltage or congestion constraints.</p>
<p>Realising these capacity gains also requires integrating these technologies into
both strategic grid planning and operational planning processes, supported by
regulatory frameworks that incentivise grid optimisation and operational
procedures that enable system operators to leverage the additional capacity.</p>
<table>
  <caption>Overview of grid technology upgrades and their characteristics</caption>
  <thead><tr><th>Technology</th><th>Capacity increase</th><th>Lead time</th></tr></thead>
  <tbody>
    <tr><td>Dynamic line rating</td><td>20–30%</td><td>1–2 years</td></tr>
    <tr><td>Dynamic transformer rating</td><td>5–15%</td><td>1–2 years</td></tr>
    <tr><td>Topology optimisation</td><td>5–15%</td><td>1–2 years</td></tr>
    <tr><td>Advanced power flow control</td><td>10–20%</td><td>2–3 years</td></tr>
    <tr><td>Storage as a transmission asset</td><td>30–40%</td><td>2–3 years</td></tr>
    <tr><td>Reconductoring</td><td>50–100%</td><td>3–4 years</td></tr>
    <tr><td>Voltage uprating</td><td>100–200%</td><td>4–7 years</td></tr>
    <tr><td>New high-voltage lines</td><td>—</td><td>7+ years</td></tr>
  </tbody>
</table>
<p class="figure-caption">Capacity increases are high-level estimates and vary
with system constraints. Multiple technologies may address the same constraint,
so their benefits are not additive.</p>
<div class="licence-note"><p>Source: IEA (2026), <em>Electricity 2026</em>,
“Grids,” IEA, Paris. © IEA 2026.
<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.
Changes are described above.</p></div>
"""


BODY_ITEMS: list[dict[str, str]] = [
    {
        "number": "1",
        "section": "Read First",
        "title": "The Factory Floor, Part 2 of 4: On Design for Manufacturing",
        "byline": "Andrew “bunnie” Huang · bunnie’s blog · 2013",
        "meta": "14 min · Practitioner essay · Reader brief",
        "url": "https://www.bunniestudios.com/blog/the-factory-floor-part-1-of-4the-quotation-or-how-to-make-a-bom/the-factory-floor-part-2-of-4on-design-for-manufacturing/",
        "margin": "Read this as a model for repeatable physical work: the hundredth unit, not just the first prototype.",
        "body": """
<p class="synopsis-lead">A prototype proves that a design can work. Manufacturing
asks whether normal variation still lets it work repeatedly, economically and
without heroic intervention.</p>
<p>Huang’s central concern is yield. Component tolerances, voltage margins, PCB and
mechanical variation, and cosmetic defects create combinations that a bench build
may never reveal. A design that is sensitive to those combinations converts
apparently cheap components into rework, scrap and late invoices. Spending more on
a robust circuit can therefore lower the cost of each saleable unit.</p>
<p>The companion idea is testability. Every physical product implies a second
product: the factory test system. Good test fixtures cover every user-facing
feature, minimise setup, automate a linear pass/fail flow, record results against
serial numbers and remain easy to update. Production testing checks assembly;
validation asks whether the design survives its intended life. Confusing the two
either misses faults or makes every unit carry an unnecessarily expensive test.</p>
<h3>Carry into the workshop</h3>
<ul class="key-points">
  <li>Write tolerances and acceptance criteria before the production run.</li>
  <li>Price yield loss per saleable unit, not only the bill of materials.</li>
  <li>Design test points and fixture access into the product from the start.</li>
  <li>Make pass/fail evidence auditable and tied to a serial number.</li>
</ul>
""",
    },
    {
        "number": "2",
        "section": "Read First",
        "title": "South Africa Infrastructure Modernization and Job Creation Development Policy Loan",
        "byline": "World Bank · Factsheet · 22 July 2026",
        "meta": "9 min · Institutional policy map · Reader brief",
        "url": "https://www.worldbank.org/en/news/factsheet/2026/07/22/south-africa-infrastructure-modernization-and-job-creation-development-policy-loan",
        "margin": "Separate completed policy actions from modelled outcomes. The factsheet is strongest as a map of mechanisms.",
        "body": """
<p class="synopsis-lead">The operation is a USD 1.5 billion general-budget loan
tied to completed reforms in electricity, freight transport, and water and
sanitation rather than to a list of construction projects.</p>
<p>Its electricity pillar supports a wholesale market, a stronger regulator,
private transmission investment and improved distribution. Freight measures aim
to introduce private rail operators and port concessions. Water measures focus on
regulatory oversight, performance-based licensing and greater financial autonomy
for the National Water Resources Infrastructure Agency.</p>
<p>The institution’s model projects that the wider reform programme could support
the equivalent of almost 600,000 additional, better-paid jobs by 2032. That is a
scenario, not an observed labour-market result. The useful follow-up is to compare
milestones on the public reform dashboard with freight, electricity, manufacturing
and employment data over time.</p>
""",
    },
    {
        "number": "3",
        "section": "Read First",
        "title": "How to find the right career for you",
        "byline": "Benjamin Todd · 80,000 Hours · May 2026",
        "meta": "10 min · Career strategy · Reader brief",
        "url": "https://80000hours.org/career-guide/personal-fit/",
        "margin": "Keep the experimental method even if you do not adopt the organisation’s wider philosophy of career impact.",
        "body": """
<p class="synopsis-lead">Career fit is hard to predict from introspection alone.
Treat it as a sequence of hypotheses that earn progressively more expensive
tests.</p>
<p>Begin with provisional rankings. Then list the uncertainties that would actually
change the ordering: day-to-day enjoyment, rate of skill growth, realistic entry
chances, fit with personal constraints, or performance relative to peers. Resolve
the most decision-relevant uncertainty with the cheapest available contact with
reality.</p>
<ol class="key-points">
  <li>Read enough to sharpen the question.</li>
  <li>Talk to practitioners and ask about the work behind the job title.</li>
  <li>Try a short project that resembles the real activity.</li>
  <li>Escalate to a placement or larger commitment only when earlier tests justify it.</li>
  <li>Update the ranking; stop testing when new evidence no longer changes the decision.</li>
</ol>
<p>This approach turns “find the right path” from a demand for certainty into a
managed learning process.</p>
""",
    },
    {
        "number": "4",
        "section": "Read First",
        "title": "Climate dependent feasibility of closing water and nutrient cycles in industrial aqua-agriculture",
        "byline": "de Korte et al. · iScience · 8 June 2026",
        "meta": "Research article · Open access (CC BY 4.0) · Main text embedded",
        "url": PAPER_URL,
        "margin": "This is a model-based design study, not a field demonstration. Use it to expose constraints and candidate architectures, then ask what economics and operating data would be needed to validate them.",
        "body": "__PAPER__",
    },
    {
        "number": "5",
        "section": "Current Threads",
        "title": "Precision Labs series: Brushed-DC motors",
        "byline": "Texas Instruments · Technical training series",
        "meta": "27 min 7 sec · Four videos · Viewing guide",
        "url": "https://www.ti.com/video/series/precision-labs/ti-precision-labs-brushed-dc-motors.html",
        "margin": "Keep a motor-driver circuit nearby and map each concept to a physical component or signal after each segment.",
        "body": """
<p class="synopsis-lead">A compact route from “make the motor turn” to the
electrical behaviour of a practical driver.</p>
<ol class="key-points">
  <li><strong>Brushed-DC fundamentals — 4:29.</strong> Identify voltage, current,
  torque and back-EMF in the motor you have.</li>
  <li><strong>The H-bridge — 6:39.</strong> Trace the current path for forward,
  reverse, coast and brake states.</li>
  <li><strong>Interfaces and PWM frequencies — 8:43.</strong> Relate the control
  inputs and switching frequency to the microcontroller and audible behaviour.</li>
  <li><strong>Practical driving — 7:16.</strong> Locate the protection, current
  path and heat-dissipation decisions on the actual board.</li>
</ol>
<p>This item remains a video chapter rather than a transcript; the link opens the
complete series.</p>
""",
    },
    {
        "number": "6",
        "section": "Current Threads",
        "title": "Manufacturing: Production and sales, June 2026 — key findings",
        "byline": "Statistics South Africa · 11 August 2026",
        "meta": "5 min · Primary economic data · Data brief",
        "url": "https://www.statssa.gov.za/?PPN=P3041.2&SCH=74327&page_id=1856",
        "margin": "One release is a datapoint, not a trend. Keep it beside longer series and claims about industrial recovery.",
        "body": """
<p class="synopsis-lead">South African manufacturing production in June was
1.7% lower than a year earlier. Seasonally adjusted production fell 1.5%
quarter-on-quarter in the second quarter.</p>
<p>Food and beverages, furniture and other manufacturing, and basic metals and
machinery were among the negative contributors. The release is useful precisely
because it constrains stories about productive capacity with measured output.
Month-to-month volatility, revisions and base effects mean it should be read as
part of the time series rather than as a verdict on the sector.</p>
""",
    },
    {
        "number": "7",
        "section": "Current Threads",
        "title": "Quarterly Labour Force Survey, Q2 2026 — key findings",
        "byline": "Statistics South Africa · 11 August 2026",
        "meta": "6 min · Primary labour-market data · Data brief",
        "url": "https://www.statssa.gov.za/?PPN=P0211&SCH=74512&page_id=1856",
        "margin": "Read the broader underutilisation measures and participation rates with the headline unemployment rate.",
        "body": """
<p class="synopsis-lead">The official unemployment rate rose to 33.6% in the
second quarter. The unemployed population reached about 8.5 million while total
employment was broadly flat at 16.7 million.</p>
<p>The important question is structural: how much labour is not being absorbed, in
which regions and age groups, and how does that compare with the bottlenecks that
infrastructure reform, industrial policy, entrepreneurship and skills programmes
claim to address? The expanded definition of unemployment helps show the scale
hidden when discouraged work-seekers leave the headline denominator.</p>
""",
    },
    {
        "number": "8",
        "section": "Current Threads",
        "title": "Turnover Tax",
        "byline": "South African Revenue Service · Updated 19 August 2026",
        "meta": "8 min · Primary tax guidance · Practical brief",
        "url": "https://www.sars.gov.za/types-of-tax/turnover-tax/",
        "margin": "A simpler regime is not automatically a cheaper one. Physical products can carry significant material and equipment costs while turnover tax is charged on revenue.",
        "body": """
<p class="synopsis-lead">Budget 2026 raised the qualifying annual-turnover ceiling
for the simplified regime to R2.3 million. Under the current table, the first
R600,000 of taxable turnover is charged at 0%.</p>
<p>The decision is not simply “qualify or do not qualify.” Compare the turnover-tax
schedule with ordinary income tax using plausible gross margins, material costs,
equipment purchases and owner remuneration. Then check exclusions, record-keeping,
VAT interaction and the administrative consequences of entering or leaving the
regime. This is a prompt to model the option, not tax advice.</p>
<div class="source-note"><p>Tax rules change. Verify the current SARS page and,
before acting, obtain advice appropriate to the business structure.</p></div>
""",
    },
    {
        "number": "9",
        "section": "World / Context",
        "title": "Grids — Electricity 2026",
        "byline": "International Energy Agency · 2026",
        "meta": "10 min · Intergovernmental analysis · Open text embedded",
        "url": "https://www.iea.org/reports/electricity-2026/grids",
        "margin": "Read this as a systems constraint: cheap generation does not help if connection, transformers, permitting, operations and regulation cannot move the power.",
        "body": "__IEA__",
    },
    {
        "number": "10",
        "section": "World / Context",
        "title": "Six months into Iran war, almost half of global oil flows from war zones",
        "byline": "Seher Dareen, Anushree Ashish Mukherjee & Robert Harvey · Reuters · 25 August 2026",
        "meta": "6 min · Reporting and data synthesis · Reader brief",
        "url": "https://www.reuters.com/business/energy/six-months-into-iran-war-almost-half-global-oil-flows-war-zones-2026-08-25/",
        "margin": "One article is enough here. Follow the economic transmission channel rather than the rolling stream of war updates.",
        "body": """
<p class="synopsis-lead">Reuters calculates that conflict-affected countries now
account for more than 43% of global oil output, while a portion of major refining
capacity is also unavailable.</p>
<p>For South Africa, the useful frame is exposure rather than battlefield detail:
crude and refined-product prices feed into transport, food distribution,
inflation, interest-rate expectations and the operating costs of physical
businesses. Watch duration, insurance and shipping costs, refinery outages and
the degree to which spare capacity can offset disruption.</p>
""",
    },
    {
        "number": "11",
        "section": "Constructive",
        "title": "AIIB’s First Investment in South Africa: USD500 Million to Strengthen Climate-Resilient Urban Services",
        "byline": "Asian Infrastructure Investment Bank · 7 August 2026",
        "meta": "6 min · Institutional announcement · Reader brief",
        "url": "https://aiib.org/en/news-events/news/2026/aiib-first-investment-in-south-africa-usd500-million-strengthen-climate-resilient-urban-services.html",
        "margin": "Treat the loan and its targets as a commitment. The constructive story becomes real only when operating indicators improve.",
        "body": """
<p class="synopsis-lead">AIIB’s first South African investment is a USD 500
million sovereign-backed loan supporting a wider USD 3 billion metro trading
services programme led by the government and co-financed with the World Bank.</p>
<p>The programme covers water, sanitation, electricity and solid waste. Its useful
design feature is performance-based financing: funds are connected to governance,
financial management, operational efficiency and climate-smart investment. The
stated outcomes include lower non-revenue water and electricity losses and more
reliable municipal services. Future reading should return to measured losses,
collection rates, maintenance performance and service reliability—not repeat the
announcement.</p>
""",
    },
    {
        "number": "12",
        "section": "Serendipity",
        "title": "The End of the Future",
        "byline": "Peter Thiel · National Review · 3 October 2011",
        "meta": "18 min · Long-form argument · Reader brief",
        "url": "https://www.nationalreview.com/2011/10/end-future-peter-thiel/",
        "margin": "Read this 2011 argument as a diagnosis to test against what happened next, not as a settled history of technological progress.",
        "body": """
<p class="synopsis-lead">Thiel argues that the broad technological acceleration
expected in the mid-twentieth century narrowed after the 1970s, leaving computing
as an exception rather than the rule.</p>
<p>The essay connects slower progress in transport, energy, medicine and physical
infrastructure to weaker growth and political strain. Its value here is the
question it poses to an edition about productive capacity: which kinds of progress
can society still build reliably, and what blocks the rest? The argument is both
historical and political; subsequent advances in AI, batteries, renewable energy
and commercial spaceflight provide evidence with which to update it.</p>
""",
    },
    {
        "number": "13",
        "section": "Serendipity",
        "title": "On Grindslop",
        "byline": "Will Manidis · X Articles · 20 May 2026",
        "meta": "20 min · Cultural essay · Full user-supplied text",
        "url": "https://x.com/WillManidis/status/2057094527236665598",
        "margin": "Separate the useful distinction between hard work and performed suffering from the essay’s deliberately provocative rhetoric.",
        "body": "__GRINDSLOP__",
    },
]


def build_html(work: Path) -> str:
    edition = parse_edition_source()
    paper = build_paper_html(work)
    body_by_number = {item["number"]: item for item in BODY_ITEMS}
    source_items = edition["items"]
    assert isinstance(source_items, list)

    items: list[dict[str, str]] = []
    for source_item in source_items:
        body_item = body_by_number.get(source_item["number"])
        if body_item is None:
            raise ValueError(
                f"No EPUB body is configured for item {source_item['number']}: "
                f"{source_item['title']}"
            )
        items.append({**body_item, **source_item})

    title = html.escape(str(edition["title"]))
    date = html.escape(str(edition["date"]))
    summary = html.escape(str(edition["summary"]))
    editor_note = html.escape(str(edition["editor_note"]))
    chunks = [
        f"""
<h1>About this edition</h1>
<div class="frontmatter">
  <p class="frontmatter-name">{title} · {date}</p>
  <p class="edition-deck">Building real things, and understanding the systems around them.</p>
  <aside class="editorial-note"><p><span class="editorial-label">Editor’s note.</span>
  {editor_note}</p></aside>
  <p class="reading-meta">{summary} · Personal Kindle edition</p>
</div>
"""
    ]

    current_section = ""
    for item in items:
        if item["section"] != current_section:
            current_section = item["section"]
            chunks.append(
                f'<h1>{html.escape(current_section)}</h1>'
                f'<p class="section-kicker">{title} · {date}</p>'
            )
        chunks.append(article_header(item))
        body = item["body"]
        if body == "__PAPER__":
            body = paper
        elif body == "__IEA__":
            body = IEA_BODY
        elif body == "__GRINDSLOP__":
            body = build_grindslop_html()
        chunks.append(body)
        chunks.append(source_link(item["url"]))

    document = "\n".join(chunks)
    document = re.sub(
        r'<span\b(?=[^>]*\bclass="citation")[^>]*>.*?</span>',
        "",
        document,
        flags=re.DOTALL,
    )
    # Pandoc's HTML reader retains div classes more reliably than paragraph
    # classes. Wrap styled paragraphs so Kindle-specific typography survives.
    return re.sub(
        r'<p class="([^"]+)">(.*?)</p>',
        r'<div class="\1"><p>\2</p></div>',
        document,
        flags=re.DOTALL,
    )


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    for required in ["pandoc", "rsvg-convert"]:
        if shutil.which(required) is None:
            raise SystemExit(f"Required executable not found: {required}")

    with tempfile.TemporaryDirectory(prefix="cerulean-crest-") as temp:
        work = Path(temp)
        cover = work / "cover.png"
        source = work / "cerulean-crest.html"

        run(
            "rsvg-convert",
            "-w",
            "1600",
            "-h",
            "2560",
            str(ASSETS / "cerulean_crest_cover.svg"),
            "-o",
            str(cover),
        )
        source.write_text(build_html(work), encoding="utf-8")

        run(
            "pandoc",
            "-f",
            "html",
            "-t",
            "epub3",
            str(source),
            "--output",
            str(OUTPUT),
            "--metadata",
            "title=Cerulean Crest — 25 August 2026",
            "--metadata",
            "subtitle=A personal daily magazine",
            "--metadata",
            "author=Cerulean Crest",
            "--metadata",
            "date=2026-08-25",
            "--metadata",
            "lang=en-ZA",
            "--metadata",
            "identifier=cerulean-crest-2026-08-25",
            "--css",
            str(ASSETS / "cerulean_crest.css"),
            "--epub-cover-image",
            str(cover),
            "--epub-title-page=false",
            "--toc",
            "--toc-depth=2",
            "--split-level=1",
            "--resource-path",
            os.pathsep.join([str(work), str(ROOT)]),
        )

    print(OUTPUT)


if __name__ == "__main__":
    main()
