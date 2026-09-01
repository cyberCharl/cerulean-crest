import type { IssueInput } from "./schema";

export const seedIssue: IssueInput = {
  date: "2026-09-01",
  title: "Cerulean Crest",
  editorNote: "Industrial design, South African manufacturing, practical marine robotics, cities as ecological systems, waste, surfing and two low-friction engineering/history pieces. No academic papers.",
  coverageGap: "Palladium, Future / Proof and Threading the Needle were checked across recent and older material. The intended James O. Sullivan newsletter could not be confidently identified.",
  availableMinutes: 113,
  expectedMinutes: 57,
  sections: [
    {
      title: "Read First",
      items: [
        {
          title: "South African manufacturing mood slumps further in August",
          author: "Nilutpal Timsina",
          publication: "Reuters",
          publishedAt: "1 September 2026",
          readingMinutes: 6,
          type: "Current economic reporting",
          url: "https://www.reuters.com/world/africa/south-african-manufacturing-mood-slumps-further-august-absa-pmi-shows-2026-09-01/",
          summary: "The Absa manufacturing PMI fell to 45.8, its fourth consecutive decline, while business activity dropped sharply to 40.2. Export sales improved somewhat; the main weakness appears domestic, making this a useful snapshot of the actual industrial economy rather than a generic growth headline."
        },
        {
          title: "The Triumph of German Industrial Modernism",
          author: "James Gilliland",
          publication: "Palladium Magazine",
          publishedAt: "23 January 2026",
          readingMinutes: 18,
          type: "Industrial history / design essay",
          url: "https://www.palladiummag.com/2026/01/23/the-triumph-of-german-industrial-modernism/",
          summary: "The Deutsche Werkbund deliberately connected craftsmen, designers, educators and industrial firms, arguing that mass production did not have to mean abandoning judgment, beauty or material integrity."
        },
        {
          title: "Bedrock Ocean Exploration and First Marine Solutions launch North Sea AUV partnership",
          author: "Haley McQueen",
          publication: "Ocean News & Technology",
          publishedAt: "6 August 2026",
          readingMinutes: 7,
          type: "Marine-technology industry case study",
          url: "https://oceannews.com/news/science-technology/bedrock-ocean-exploration-and-first-marine-solutions-launch-north-sea-auv-partnership/",
          summary: "This is the useful side of ocean robotics: how an AUV company builds the operational layer around its machines. Bedrock is stationing vehicles at an Aberdeen survey company to combine autonomous technology with local offshore expertise and customer operations."
        }
      ]
    },
    {
      title: "Current Threads",
      items: [
        {
          title: "SA turns to private capital to unlock R2trn infrastructure pipeline",
          author: "Ciaran Ryan",
          publication: "Moneyweb",
          publishedAt: "24 August 2026",
          readingMinutes: 10,
          type: "South African infrastructure reporting",
          url: "https://www.moneyweb.co.za/news/economy/sa-turns-to-private-capital-to-unlock-r2trn-infrastructure-pipeline/",
          summary: "South Africa has plenty of proposed infrastructure; the bottleneck is getting projects through feasibility and into something financiers can actually fund. Roughly R1.2 trillion of the pipeline reportedly remains stuck at feasibility stage, with water projects particularly problematic."
        },
        {
          title: "Taihan and Panstar Robotics partner to develop domestic ROVs for submarine cable projects",
          author: "Haley McQueen",
          publication: "Ocean News & Technology",
          publishedAt: "20 August 2026",
          readingMinutes: 6,
          type: "Marine industry / robotics",
          url: "https://oceannews.com/news/subsea-cable/taihan-cable-and-panstar-robotics-partner-to-develop-domestic-rovs-for-hvdc-submarine-cable-projects/",
          summary: "A Korean cable manufacturer wants its own ROV capability for offshore wind and HVDC cable installation. Interesting less for the robot itself than for the industrial logic: adding a specialised technical capability to strengthen a much larger infrastructure business."
        }
      ]
    },
    {
      title: "Systems & Place",
      items: [
        {
          title: "Cities are a borderland where the wild and built worlds meet",
          author: "Chris Otter",
          publication: "Aeon",
          publishedAt: "2020",
          readingMinutes: 14,
          type: "Environmental history / cities essay",
          url: "https://aeon.co/essays/cities-are-a-borderland-where-the-wild-and-built-worlds-meet",
          summary: "Cities are normally imagined as human objects imposed on nature. Otter instead treats Alexandria and Edinburgh as products of interacting geology, water, climate, animals, infrastructure and people—a much richer systems frame for the built environment."
        },
        {
          title: "The Waste Age",
          author: "Justin McGuirk",
          publication: "Aeon",
          publishedAt: "2021",
          readingMinutes: 14,
          type: "Design / industrial ecology essay",
          url: "https://aeon.co/essays/ours-is-the-waste-age-thats-the-key-to-tranforming-the-future",
          summary: "Waste should be treated as a central output of design and production rather than an embarrassing downstream side-effect. It is a useful companion to circular-systems thinking because it starts with material reality rather than sustainability branding."
        }
      ]
    },
    {
      title: "World / Context",
      items: [
        {
          title: "Factory activity bounced in August as AI fuelled Asian expansion",
          author: "Reuters",
          publication: "Reuters",
          publishedAt: "1 September 2026",
          readingMinutes: 5,
          type: "Global industrial reporting",
          url: "https://www.reuters.com/world/china/global-economy-global-ai-boom-fuels-asia-factory-expansion-august-2026-09-01/",
          summary: "A useful contrast with South Africa today: manufacturing expanded across several major Asian economies, while eurozone factories grew at their fastest rate in more than four years. AI hardware demand is becoming a material industrial phenomenon—not merely a software-market story."
        }
      ]
    },
    {
      title: "Constructive",
      items: [
        {
          title: "African countries commit to train and retain 3 million more health workers by 2035",
          author: "WHO Regional Office for Africa",
          publication: "WHO",
          publishedAt: "26 August 2026",
          readingMinutes: 4,
          type: "Primary institutional update",
          url: "https://afro.who.int/news/african-countries-commit-train-and-retain-3-million-more-health-workers-2035",
          summary: "The new agenda is not framed merely as ‘train more people’: it explicitly includes employment, retention, workforce planning and health labour markets. Whether governments finance the commitment is the obvious question to watch."
        }
      ]
    },
    {
      title: "Casual Reading",
      items: [
        {
          title: "At the heart of surfing is the pursuit of moments so pure they clean you out",
          author: "Tom Chatfield",
          publication: "Aeon",
          publishedAt: "11 August 2025",
          readingMinutes: 9,
          type: "Personal essay / surfing",
          url: "https://aeon.co/essays/at-the-heart-of-surfing-is-the-pursuit-of-moments-so-pure-they-clean-you-out",
          summary: "Surfing, grief, ageing and the peculiar ability of a wave to temporarily erase everything except the immediate physical problem in front of you. Included because it is well written and should be enjoyable, not because it advances a project."
        },
        {
          title: "How an ancient curiosity evolved to power the modern world",
          author: "Bill Hammack / Engineer Guy",
          publication: "Aeon",
          publishedAt: "8 June 2026",
          readingMinutes: 7,
          type: "Short engineering video",
          url: "https://aeon.co/videos/how-an-ancient-curiosity-evolved-to-power-the-modern-world",
          summary: "Hammack traces steam technology from an ancient novelty to the turbine, using demonstrations to show how engineers gradually turned one physical phenomenon into useful machinery. Very low-friction engineering history."
        }
      ]
    },
    {
      title: "Serendipity",
      items: [
        {
          title: "Silk is a thread that opens up the weave of human history",
          author: "Aarathi Prasad",
          publication: "Aeon",
          publishedAt: "2023",
          readingMinutes: 13,
          type: "Material culture / global history",
          url: "https://aeon.co/essays/silk-is-a-thread-that-opens-up-the-weave-of-human-history",
          summary: "Silk connects biology, agriculture, hand skill, mechanisation, trade and cultural history. The particularly good thread is how technological and economic changes can destroy not merely jobs but entire bodies of tacit craft knowledge."
        }
      ]
    }
  ]
};
