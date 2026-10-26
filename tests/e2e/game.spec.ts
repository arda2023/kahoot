import { test,expect } from '@playwright/test';
test('host and two players play to the podium, with reload recovery',async({browser})=>{
 const host=await browser.newPage(),a=await browser.newPage(),b=await browser.newPage();
 await host.goto('/');await host.getByRole('button',{name:'Beispielquiz starten'}).click();
 const pin=await host.getByTestId('pin').innerText();
 for(const [page,name] of [[a,'Ada'],[b,'Ben']] as const){await page.goto('/');await page.getByLabel('Spiel-PIN').fill(pin);await page.getByLabel('Dein Name').fill(name);await page.getByRole('button',{name:'Beitreten'}).click();await expect(page.getByText('Warte, bis der Host')).toBeVisible();}
 await expect(host.getByText('2 Personen in der Lobby')).toBeVisible();await host.getByRole('button',{name:'Spiel starten'}).click();
 const correct=['Sechs','Wahr','Merkur'];
 for(let i=0;i<3;i++){
  await a.getByRole('button',{name:correct[i],exact:false}).click();await expect(a.getByText('Antwort gespeichert ✓')).toBeVisible();
  if(i===0){await a.reload();await expect(a.getByText('Antwort gespeichert ✓')).toBeVisible();await expect(a.getByRole('button',{name:'Sechs'})).toBeDisabled();}
  await b.getByRole('button',{name:correct[i],exact:false}).click();
  await host.getByRole('button',{name:'Rangliste anzeigen'}).click();await expect(a.getByRole('heading',{name:'Rangliste',exact:true})).toBeVisible();
  await host.getByRole('button',{name:i===2?'Ergebnis anzeigen':'Nächste Frage'}).click();
 }
 for(const p of [host,a,b]){await expect(p.getByRole('heading',{name:'Endergebnis'})).toBeVisible();await expect(p.locator('.ranking li')).toHaveCount(2);}
 await host.screenshot({path:'test-results/podium.png',fullPage:true});
 await Promise.all([host.close(),a.close(),b.close()]);
});
