/**
 * Better — one Solari cloud browser per assignment.
 *
 * Polar-for-work: an agentic browser that manages schoolwork, not research.
 * Harvest the work list once, persist the item links, then click the first
 * assignment IN the page (Playwright click / scroll / press). Never bounce
 * between sibling list URLs with goto().
 */
import { mkdir, writeFile } from "node:fs/promises"
import { Solari } from "@solarisdk/browser"

const apiKey = process.env.SOLARI_API_KEY
if (!apiKey) {
  console.error("Missing SOLARI_API_KEY. Get one at https://console.getsolari.com")
  process.exit(1)
}

const solari = new Solari({ apiKey })
const PROFILE_NAME = "better-assignment"

// Reuse the profile across assignment runs; create it the first time only.
const existing = (await solari.profiles.list()).find((p) => p.name === PROFILE_NAME)
const profile = existing ?? (await solari.profiles.create({ name: PROFILE_NAME }))
console.log(existing ? `reusing profile ${profile.id}` : `created profile ${profile.id}`)

// `browser.close()` also RELEASES the session. Closing the browser alone would
// leave the slot held until the plan deadline, so prefer try/finally.
const browser = await solari.launch({
  stealth: true,
  profileId: profile.id,
})
try {
  const page = await browser.newPage()

  // Public work-list stand-in. One goto to open the list — after this, act in-page.
  await page.goto("https://news.ycombinator.com")
  await page.locator(".titleline > a").first().waitFor()
  await page.mouse.wheel(0, 600)

  // Harvest every item from the list in one pass. Do not goto() each sibling URL.
  const items = await page.locator(".titleline > a").evaluateAll((anchors) =>
    anchors.map((a) => {
      const el = a as HTMLAnchorElement
      return { title: el.innerText.trim(), href: el.href }
    }),
  )
  console.log("harvested:", items.length, "items")

  await mkdir("artifacts", { recursive: true })
  await writeFile("artifacts/harvested.json", JSON.stringify(items, null, 2))

  // Stay on this assignment: click in-page, do not goto() a sibling list URL.
  await page.locator(".titleline > a").first().click()
  await page.waitForLoadState("domcontentloaded")
  await page.keyboard.press("End")

  console.log("title  :", await page.title())
  console.log("url    :", page.url())
  console.log("session:", browser.id)

  await page.screenshot({ path: "artifacts/assignment.png", fullPage: true })

  // Persist whatever the browser accumulated. Without this the session's state
  // is discarded on release — attaching a profile does not auto-save it.
  const state = await page.context().storageState()
  const { version, sizeBytes } = await solari.profiles.save(profile.id, state)
  console.log(`saved profile v${version} (${sizeBytes} bytes)`)
} finally {
  await browser.close()
  // REQUIRED in Node, and easy to miss: the client keeps a loopback proxy
  // server open for the connection-retry path, and that handle keeps the
  // event loop alive. Skip this and your script prints its output and then
  // hangs forever instead of exiting.
  await solari.close()
}
