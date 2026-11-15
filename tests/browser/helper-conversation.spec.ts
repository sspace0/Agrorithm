import { test, expect } from "@playwright/test";

test.use({ serviceWorkers:"block" });

for(const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
  test(`helper handles the tomato question and historical follow-ups at ${viewport.width}px`,async({page})=>{
    await page.setViewportSize(viewport);
    await page.goto("./#/help");
    await page.locator(".boot-overlay").waitFor({state:"hidden"});
    await page.getByRole("button",{name:"Ask Agrorithm",exact:true}).click();
    const input=page.getByLabel("Your question",{exact:true});
    const ask=async(question:string)=>{await input.fill(question);await page.getByRole("button",{name:"Send question",exact:true}).click();};
    for(const greeting of ["Hey there! How are you?","Hello there, how’s it going?","Good morning!"]) {
      await ask(greeting);
      await expect(page.locator(".agr-helper-answer").last()).toContainText("Hi! I’m ready to help.");
      await expect(page.locator(".agr-helper-answer").last()).not.toContainText("UNAVAILABLE EVIDENCE");
    }
    await ask("Thank you so much!");
    await expect(page.locator(".agr-helper-answer").last()).toContainText("You’re welcome.");
    await ask("Hey there! How are you? Explain irrigation water accounting");
    await expect(page.locator(".agr-helper-answer").last()).toContainText("millimetre");
    await ask("Explain irrigation water accounting\nbest water method for tomato");
    const answer=page.locator(".agr-helper-answer").last();
    await expect(answer).toContainText("millimetre");
    await expect(answer).toContainText("Tomato: choosing an irrigation method");
    await expect(answer).toContainText("no universal best");
    await expect(answer.locator('a[href="https://www.fao.org/4/s8684e/s8684e07.htm"]')).toHaveCount(1);
    await expect.poll(async()=>{
      const heading=await answer.locator("h3").boundingBox();
      const log=await page.locator(".agr-helper-log").boundingBox();
      return !!heading&&!!log&&heading.y>=log.y&&heading.y+heading.height<log.y+log.height;
    }).toBe(true);
    const heading=await answer.locator("h3").boundingBox();
    const log=await page.locator(".agr-helper-log").boundingBox();
    expect(heading!.y).toBeGreaterThanOrEqual(log!.y);
    expect(heading!.y+heading!.height).toBeLessThan(log!.y+log!.height);
    await page.screenshot({path:`test-results/helper-conversation-${viewport.width}.png`});
    await answer.getByRole("heading",{name:"Tomato: choosing an irrigation method",exact:true}).scrollIntoViewIfNeeded();
    await page.screenshot({path:`test-results/helper-method-${viewport.width}.png`});
    await ask("What was July 2023 like?");
    await expect(page.locator(".agr-helper-answer").last()).toContainText("31/31");
    await ask("what about August?");
    await expect(page.locator(".agr-helper-answer").last()).toContainText("Assuming 2023");
    await ask("compare with last year");
    await expect(page.locator(".agr-helper-answer").last()).toContainText("August 2022");
    await expect(page.locator(".agr-helper-answer").last()).toContainText("percentage points");
    await page.getByRole("button",{name:"Clear conversation",exact:true}).click();
    await ask("what about August?");
    await expect(page.locator(".agr-helper-answer").last()).toContainText("Which historical month and year?");
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
  });
}
