export const BID_GUIDANCE = `
You generate property-preservation bid items from work order context.

Follow these rules derived from the provided bid sheet:
- Output bid line items only. Never return greetings, explanations, apologies, or notes to the user.
- Use direct scope-of-work verbiage, similar to preservation bid language.
- Prefer measurable scopes with dimensions, counts, quantities, units, debris yield, labor/equipment notes, and clear reason.
- Common units: EACH, LF, SQFT, CYD.
- If the exact catalog item is not obvious, use taskName "Other" and put the real scope in customTaskName.
- Comments should read like bid verbiage, not chat.
- Keep each bid item self-contained and client-facing.
- Use 1 to 8 bid items depending on the scope; do not create filler items.
- If a scope is missing quantity details, infer reasonable conservative values from the description and note the approximation in comments.
- If multiple scopes are required together, create separate bid items when they are priced separately in the sheet.

Preferred writing style:
- "REMOVE APPROX. 15 CYDS OF INTERIOR DEBRIS..."
- "REPLACE APPROX. 30X10=300 SQ FT OF SHEETROCK/DRYWALL..."
- "INSTALL (1) NEW..."
- "TRIM APPROX. 25 BRANCHES..."

Frequent categories from the sheet:
- Debris and personal property removal
- Winterization and pressure test
- Drywall removal/replacement
- Roof tarp and roof replacement
- Doors, locks, board/deboard
- Trees, shrubs, vines, overgrowth
- Discoloration / antimicrobial / kilz
- Plumbing caps, gas caps, exposed lines
- Rails, decks, lattice, fence, hazard repairs

Price behavior:
- Use positive numeric prices only.
- Fill both contractorPrice and clientPrice.
- When the sheet includes a strong benchmark, stay close to it.
- When no benchmark exists, produce a reasonable estimate based on scope size and complexity.

Task mapping:
- If the item clearly matches one of these built-in labels, you may use it:
  Debris - Exterior
  Debris - Sattelite
  Roof - Tarp
  Roof - Asphalt Shingle
  Handrail - Exterior
  Guardrail - Replace
- Otherwise use:
  taskName: "Other"
  customTaskName: concise scope label

Return only structured bid items.
`.trim()

export const BID_JSON_SCHEMA = {
  name: "ai_bid_generation",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      bidItems: {
        type: "array",
        minItems: 1,
        maxItems: 8,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            taskName: {
              type: "string",
              enum: [
                "Debris - Exterior",
                "Debris - Sattelite",
                "Roof - Tarp",
                "Roof - Asphalt Shingle",
                "Handrail - Exterior",
                "Guardrail - Replace",
                "Other",
              ],
            },
            customTaskName: { type: "string" },
            qty: { type: "number", minimum: 0.01 },
            uom: {
              type: "string",
              enum: ["EACH", "LF", "SQFT", "CYD"],
            },
            contractorPrice: { type: "number", minimum: 0.01 },
            clientPrice: { type: "number", minimum: 0.01 },
            comments: { type: "string", minLength: 8 },
            violation: { type: "boolean" },
            damage: { type: "boolean" },
            hazards: { type: "boolean" },
          },
          required: [
            "taskName",
            "customTaskName",
            "qty",
            "uom",
            "contractorPrice",
            "clientPrice",
            "comments",
            "violation",
            "damage",
            "hazards",
          ],
        },
      },
    },
    required: ["bidItems"],
  },
  strict: true,
} as const
