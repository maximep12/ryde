import {
  test,
  expect,
  authenticateUser,
  testAuthenticatedPage,
} from "../helpers/auth-helper"
import path from "path"

test("file upload page loads correctly with proper authentication", async ({
  page,
}) => {
  await testAuthenticatedPage(page, "/fileUpload")
})

test("amazon file upload processes correctly and shows expected output", async ({
  page,
}) => {
  await authenticateUser(page)

  await page.goto("/fileUpload")
  await expect(page).toHaveURL("/fileUpload")

  const amazonFilePath = path.resolve(__dirname, "../helpers/mocks/amazon.tsv")

  const amazonSection = page.locator("text='AMAZON'").locator("..")
  await expect(amazonSection).toBeVisible()

  const fileInput = amazonSection.locator('input[type="file"]')
  await fileInput.setInputFiles(amazonFilePath)

  await expect(
    amazonSection.getByText("Selected file: amazon.tsv"),
  ).toBeVisible()

  const submitButton = amazonSection.getByText("Submit")
  await submitButton.click()

  await expect(
    page.locator(
      "text=File was successfuly uploaded, but some rows were rejected.",
    ),
  ).toBeVisible()

  await expect(page.locator("text=Result")).toBeVisible()
  await expect(page.locator("text=Rows received: 1055")).toBeVisible()
})
