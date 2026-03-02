import { test, testAuthenticatedPage } from "../helpers/auth-helper"

test("commercial page loads correctly with proper authentication", async ({
  page,
}) => {
  await testAuthenticatedPage(page, "/commercial")
})
