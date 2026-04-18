import fs from "fs"
import path from "path"

let cachedSheetText = ""

function getBidSheetText() {
  if (cachedSheetText) {
    return cachedSheetText
  }

  const filePath = path.join(process.cwd(), "src", "lib", "ai", "bid-sheet-source.txt")
  cachedSheetText = fs.readFileSync(filePath, "utf8")
  return cachedSheetText
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function findRelevantBidSheetExcerpts(query: string, limit = 3) {
  const normalizedQuery = normalize(query)
  const queryWords = normalizedQuery.split(" ").filter((word) => word.length > 2)
  const sheetText = getBidSheetText()

  const blocks = sheetText
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter((block) => block.length > 30)

  return blocks
    .map((block) => {
      const normalizedBlock = normalize(block)
      let score = 0

      queryWords.forEach((word) => {
        if (normalizedBlock.includes(word)) {
          score += 1
        }
      })

      if (normalizedBlock.includes(normalizedQuery)) {
        score += 10
      }

      return { block, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.block)
}
