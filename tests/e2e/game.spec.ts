import { test,expect } from '@playwright/test';
test('host and two players play to the podium, with reload recovery',async({browser})=>{
 const host=await browser.newPage(),a=await browser.newPage(),b=await browser.newPage();
 await a.setViewportSize({width:390,height:844});
 await host.goto('/');await host.getByRole('button',{name:'Beispielquiz starten'}).click();
 const pin=await host.getByTestId('pin').innerText();
 await expect(host.getByAltText('QR-Code zum Beitreten')).toBeVisible();
 await host.getByRole('button',{name:'Präsentationsansicht',exact:true}).click();
 await expect(host.locator('main')).toHaveClass(/presentation/);
 for(const [page,name] of [[a,'Ada'],[b,'Ben']] as const){await page.goto(`/?pin=${pin}`);await expect(page.getByLabel('Spiel-PIN')).toHaveValue(pin);await page.getByLabel('Spiel-PIN').fill(pin);await page.getByLabel('Dein Name').fill(name);await page.getByRole('button',{name:'Beitreten'}).click();await expect(page.getByText('Warte, bis der Host')).toBeVisible();}
 await expect(host.getByText('2 Personen in der Lobby')).toBeVisible();await host.getByRole('button',{name:'Spiel starten'}).click();
 const correct=['Sechs','Wahr','Merkur'];
 for(let i=0;i<3;i++){
  await a.getByRole('button',{name:correct[i],exact:false}).click();await expect(a.getByText('Antwort gespeichert ✓')).toBeVisible();
  if(i===0){await host.reload();await expect(host.getByRole('heading',{name:'Wie viele Seiten hat ein Sechseck?'})).toBeVisible();await a.reload();await expect(a.getByText('Antwort gespeichert ✓')).toBeVisible();await expect(a.getByRole('button',{name:'Sechs'})).toBeDisabled();}
  await b.getByRole('button',{name:correct[i],exact:false}).click();
  await host.getByRole('button',{name:'Rangliste anzeigen'}).click();await expect(a.getByRole('heading',{name:'Rangliste',exact:true})).toBeVisible();
  await host.getByRole('button',{name:i===2?'Ergebnis anzeigen':'Nächste Frage'}).click();
 }
 for(const p of [host,a,b]){await expect(p.getByRole('heading',{name:'Endergebnis'})).toBeVisible();await expect(p.locator('.ranking li')).toHaveCount(2);}
 expect(await a.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await expect(host.getByLabel('Podium')).toBeVisible();
 await host.screenshot({path:'test-results/podium.png',fullPage:true});
 await host.getByRole('link',{name:'Ergebnisbericht',exact:true}).click();await expect(host.getByRole('heading',{name:'Fragen im Überblick'})).toBeVisible();
 const downloading=host.waitForEvent('download');await host.getByRole('button',{name:'CSV herunterladen'}).click();const download=await downloading;const stream=await download.createReadStream();let csv='';for await(const chunk of stream!)csv+=chunk.toString();expect(csv).toContain('Ada');expect(csv.split('\r\n')).toHaveLength(7);
 await Promise.all([host.close(),a.close(),b.close()]);
});
