export type BidSheetTemplate = {
  id: string
  title: string
  taskNames: string[]
  keywords: string[]
  qty: number
  uom: "EACH" | "LF" | "SQFT" | "CYD"
  contractorPrice: number
  clientPrice: number
  comments: string
}

export const BID_SHEET_TEMPLATES: BidSheetTemplate[] = [
  {
    id: "winterization-plumbing",
    title: "Winterization - Plumbing",
    taskNames: ["winterization - plumbing", "winterization", "plumbing winterization"],
    keywords: ["winterization", "plumbing", "antifreeze", "blowing out lines", "traps", "toilets"],
    qty: 1,
    uom: "EACH",
    contractorPrice: 180,
    clientPrice: 250,
    comments:
      "PERFORM STANDARD WINTERIZATION OF PLUMBING SYSTEM, INCLUDING DRAINING ALL WATER LINES, BLOWING OUT LINES WITH COMPRESSED AIR, AND ADDING NON-TOXIC ANTIFREEZE TO ALL TRAPS, TOILETS, AND APPLIANCE LINES.",
  },
  {
    id: "pressure-test-plumbing",
    title: "Pressure Test - Plumbing",
    taskNames: ["pressure test - plumbing", "pressure test", "plumbing pressure test"],
    keywords: ["pressure test", "leaks", "plumbing system", "psi"],
    qty: 1,
    uom: "EACH",
    contractorPrice: 60,
    clientPrice: 90,
    comments:
      "CONDUCT PRESSURE TEST OF ENTIRE PLUMBING SYSTEM TO VERIFY NO LEAKS AFTER WINTERIZATION.",
  },
  {
    id: "post-winterization-notice",
    title: "Post Winterization Notice",
    taskNames: ["post winterization notice", "winterization notice", "notice posting"],
    keywords: ["notice", "posting", "winterization posting", "main entry door"],
    qty: 1,
    uom: "EACH",
    contractorPrice: 20,
    clientPrice: 35,
    comments:
      "INSTALL (1) WINTERIZATION NOTICE ON MAIN ENTRY DOOR.",
  },
  {
    id: "disconnect-drain-water-heater",
    title: "Disconnect & Drain Water Heater",
    taskNames: ["disconnect & drain water heater", "drain water heater", "disconnect water heater"],
    keywords: ["water heater", "drain", "disconnect", "winterization"],
    qty: 1,
    uom: "EACH",
    contractorPrice: 45,
    clientPrice: 70,
    comments:
      "DISCONNECT AND DRAIN (1) WATER HEATER AS PART OF WINTERIZATION PROCESS.",
  },
  {
    id: "cap-exposed-plumbing",
    title: "Cap Exposed Plumbing",
    taskNames: ["cap exposed plumbing", "cap exposed plumbing lines", "cap plumbing lines"],
    keywords: ["cap", "exposed plumbing", "washer hookups", "sink lines", "open plumbing"],
    qty: 2,
    uom: "EACH",
    contractorPrice: 25,
    clientPrice: 40,
    comments:
      "INSTALL (2) CAPS ON EXPOSED PLUMBING LINES (E.G., WASHER HOOKUPS, SINK LINES).",
  },
  {
    id: "roof-tarp",
    title: "Roof - Tarp",
    taskNames: ["roof - tarp", "tarp roof", "roof tarp"],
    keywords: ["tarp", "roof leak", "damaged roof", "temporary roof protection"],
    qty: 1,
    uom: "SQFT",
    contractorPrice: 1,
    clientPrice: 1.15,
    comments:
      "TARP DAMAGED AREA ON ROOF WITH MODERATE TARP TO HUD SPECS TO PREVENT FURTHER WATER INTRUSION.",
  },
  {
    id: "debris-exterior",
    title: "Debris - Exterior",
    taskNames: ["debris - exterior", "remove exterior debris", "exterior debris"],
    keywords: ["exterior debris", "trash out", "debris", "yard debris"],
    qty: 1,
    uom: "CYD",
    contractorPrice: 35,
    clientPrice: 50,
    comments:
      "REMOVE APPROX. 1 CYD OF EXTERIOR DEBRIS FROM THE PROPERTY AND DISPOSE OF PROPERLY.",
  },
  {
    id: "handrail-exterior",
    title: "Handrail - Exterior",
    taskNames: ["handrail - exterior", "install handrail", "exterior handrail"],
    keywords: ["handrail", "fall hazard", "steps", "entry"],
    qty: 1,
    uom: "EACH",
    contractorPrice: 125,
    clientPrice: 185,
    comments:
      "INSTALL NEW EXTERIOR HANDRAIL TO SECURE STEPS AND ADDRESS FALL HAZARD CONDITION.",
  },
  {
    id: "guardrail-replace",
    title: "Guardrail - Replace",
    taskNames: ["guardrail - replace", "replace guardrail", "guardrail"],
    keywords: ["guardrail", "deck rail", "railing", "fall hazard"],
    qty: 1,
    uom: "LF",
    contractorPrice: 12,
    clientPrice: 18,
    comments:
      "REPLACE DAMAGED / MISSING GUARDRAIL TO RESTORE SAFETY AND SECURE ELEVATED AREA.",
  },
  {
    id: "replace-blown-insulation",
    title: "Replace Blown Insulation R-11",
    taskNames: [
      "replace blown insulation",
      "install insulation",
      "replace insulation",
      "insulation",
    ],
    keywords: [
      "insulation",
      "blown insulation",
      "r-11",
      "walls",
      "ceiling",
      "contaminated insulation",
    ],
    qty: 80,
    uom: "SQFT",
    contractorPrice: 1.5,
    clientPrice: 2,
    comments:
      "REPLACE APPROX. 80 SQ FT OF INSULATION IN THE AFFECTED AREA TO MATCH EXISTING CONDITION. THIS BID INCLUDES MATERIALS, LABOR, AND INSTALLATION OF NEW INSULATION AFTER REMOVAL OF DAMAGED / CONTAMINATED MATERIAL.",
  },
  {
    id: "remove-insulation-walls",
    title: "Remove Insulation Batts From Walls - Contaminated",
    taskNames: [
      "remove insulation",
      "remove insulation from walls",
      "remove contaminated insulation",
    ],
    keywords: [
      "remove insulation",
      "contaminated insulation",
      "walls",
      "discoloration",
    ],
    qty: 300,
    uom: "SQFT",
    contractorPrice: 0.2,
    clientPrice: 0.35,
    comments:
      "REMOVE APPROX. 300 SQ FT OF CONTAMINATED INSULATION FROM WALL CAVITIES AND DISPOSE OF PROPERLY.",
  },
  {
    id: "remove-insulation-ceiling",
    title: "Remove Insulation Batts From Ceiling - Contaminated",
    taskNames: [
      "remove insulation from ceiling",
      "ceiling insulation removal",
      "remove ceiling insulation",
    ],
    keywords: [
      "ceiling insulation",
      "remove insulation",
      "contaminated insulation",
      "ceiling",
    ],
    qty: 80,
    uom: "SQFT",
    contractorPrice: 0.25,
    clientPrice: 0.4,
    comments:
      "REMOVE APPROX. 80 SQ FT OF CONTAMINATED INSULATION FROM CEILING AREA AND DISPOSE OF PROPERLY.",
  },
  {
    id: "replace-drywall-over-80",
    title: "Replace Drywall - Over 80 S.F.",
    taskNames: [
      "replace drywall",
      "install drywall",
      "drywall replacement",
      "sheetrock replacement",
    ],
    keywords: [
      "drywall",
      "sheetrock",
      "texture",
      "prime",
      "walls",
      "ceiling",
    ],
    qty: 80,
    uom: "SQFT",
    contractorPrice: 2.98,
    clientPrice: 3.5,
    comments:
      "REPLACE APPROX. 80 SQ FT OF SHEETROCK / DRYWALL IN THE AFFECTED AREA; THIS INCLUDES TAPE, BED, TEXTURE, AND READY FOR PAINT / PRIME.",
  },
  {
    id: "remove-discolored-drywall-walls",
    title: "Remove Discolored Drywall - Walls",
    taskNames: [
      "remove discolored drywall",
      "remove drywall walls",
      "drywall removal",
    ],
    keywords: [
      "remove drywall",
      "discolored drywall",
      "walls",
      "damage discoloration",
    ],
    qty: 300,
    uom: "SQFT",
    contractorPrice: 3.5,
    clientPrice: 4.25,
    comments:
      "REMOVE APPROX. 300 SQ FT OF DISCOLORED / DAMAGED DRYWALL FROM WALLS AND DISPOSE OF PROPERLY.",
  },
]

export function findMatchingBidTemplates(input: string) {
  const normalized = input.toLowerCase()
  const normalizedWords = normalized
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)

  return BID_SHEET_TEMPLATES
    .map((template) => {
      let score = 0
      template.taskNames.forEach((name) => {
        if (normalized.includes(name)) {
          score += 5
        }
      })
      template.keywords.forEach((keyword) => {
        if (normalized.includes(keyword)) {
          score += 2
          return
        }
        const keywordWords = keyword.split(/\s+/).filter(Boolean)
        const matchedWordCount = keywordWords.filter((word) => normalizedWords.includes(word)).length
        if (matchedWordCount > 0) {
          score += matchedWordCount
        }
      })
      return { template, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.template)
}
