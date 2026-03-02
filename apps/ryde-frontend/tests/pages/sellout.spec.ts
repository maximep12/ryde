import { test, testAuthenticatedPage } from "../helpers/auth-helper"

test("sellout page loads correctly with proper authentication", async ({
  page,
}) => {
  await testAuthenticatedPage(page, "/sellout")
})
