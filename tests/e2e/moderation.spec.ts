import { test, expect } from "@playwright/test";
test("host can lock a lobby and remove a participant", async ({ browser }) => {
  const host = await browser.newPage(),
    player = await browser.newPage(),
    late = await browser.newPage();
  await host.goto("/");
  await host.getByRole("button", { name: "Beispielquiz starten" }).click();
  const pin = await host.getByTestId("pin").innerText();
  await player.goto(`/?pin=${pin}`);
  await player.getByLabel("Dein Name").fill("Gast");
  await player.getByRole("button", { name: "Beitreten" }).click();
  await expect(host.getByText("1 Personen in der Lobby")).toBeVisible();
  await host.getByRole("button", { name: "Raum sperren", exact: true }).click();
  await expect(host.getByText("Beitritt gesperrt")).toBeVisible();
  await late.goto(`/?pin=${pin}`);
  await late.getByLabel("Dein Name").fill("Spät");
  await late.getByRole("button", { name: "Beitreten" }).click();
  await expect(
    late.getByRole("alert").filter({ hasText: "geschlossen" }),
  ).toBeVisible();
  await host
    .getByRole("button", { name: "Gast entfernen", exact: true })
    .click();
  await expect(host.getByText("0 Personen in der Lobby")).toBeVisible();
  await expect(
    player.getByText("Zugang nicht gültig oder Teilnahme entfernt."),
  ).toBeVisible();
  await host
    .getByRole("button", { name: "Raum entsperren", exact: true })
    .click();
  await late.getByRole("button", { name: "Beitreten" }).click();
  await expect(host.getByText("1 Personen in der Lobby")).toBeVisible();
  await Promise.all([host.close(), player.close(), late.close()]);
});
