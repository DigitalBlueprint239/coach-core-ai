# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: diag3.spec.ts >> real route waypoint drag and property transactions undo redo
- Location: tests/browser/diag3.spec.ts:152:1

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 1

@@ -1,7 +1,7 @@
  Object {
-   "depthYds": 13,
+   "depthYds": 20,
    "fromId": "p_LT_1791906329164",
    "id": "qa-route",
    "isFlipped": false,
    "isMotion": false,
    "name": "Go",
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - application [ref=e4]:
    - status [ref=e10]
  - generic [ref=e11]:
    - generic [ref=e12]:
      - heading "Playbook" [level=2] [ref=e13]
      - button "Collapse Playbook" [ref=e19] [cursor=pointer]
    - generic [ref=e22]:
      - generic [ref=e23]:
        - generic [ref=e24]:
          - generic [ref=e25]: Installs
          - button "Add Install" [ref=e26] [cursor=pointer]
        - generic [ref=e28]:
          - generic [ref=e29]: Unsaved changes
          - button "Save Now" [ref=e30] [cursor=pointer]
      - generic [ref=e32]:
        - generic [ref=e33] [cursor=pointer]:
          - heading "QA Install" [level=3] [ref=e34]
          - button "Add Play" [ref=e35]
        - list [ref=e37]:
          - listitem [ref=e38]:
            - button "QA Complete Alpha" [pressed] [ref=e39] [cursor=pointer]
          - listitem [ref=e43]:
            - button "QA Complete Bravo" [ref=e44] [cursor=pointer]
  - generic [ref=e48]:
    - generic [ref=e49]:
      - heading "Tools & Inspector" [level=2] [ref=e50]
      - button "Collapse Tools & Inspector" [ref=e56] [cursor=pointer]
    - generic [ref=e60]:
      - navigation [ref=e61]:
        - generic [ref=e62]:
          - button "Design" [ref=e63] [cursor=pointer]
          - button "Analyze" [ref=e69] [cursor=pointer]
          - button "Package" [ref=e73] [cursor=pointer]
          - button "Assistant" [ref=e79] [cursor=pointer]
      - generic [ref=e92]:
        - banner [ref=e93]:
          - heading "Design" [level=2] [ref=e94]
        - navigation [ref=e95]:
          - button "Formation" [ref=e96] [cursor=pointer]
          - button "Design" [ref=e97] [cursor=pointer]
          - button "Details" [ref=e98] [cursor=pointer]
        - generic [ref=e100]:
          - generic [ref=e101]:
            - 'heading "Route: Go" [level=4] [ref=e102]'
            - generic [ref=e103]:
              - generic [ref=e104]: Depth (yds)
              - spinbutton "Depth (yds)" [ref=e105]: "13"
            - generic [ref=e106]:
              - generic [ref=e107]: Flip Direction
              - button "Flip Horizontal" [ref=e108] [cursor=pointer]
            - generic [ref=e111]:
              - generic [ref=e112]: Pre-Snap Motion
              - generic [ref=e113] [cursor=pointer]:
                - checkbox "Pre-Snap Motion"
            - button "Delete Route" [ref=e115] [cursor=pointer]
          - generic [ref=e118]:
            - generic [ref=e119]:
              - generic [ref=e120]:
                - generic [ref=e121]:
                  - heading "Route System" [level=3] [ref=e122]
                  - generic [ref=e123]:
                    - checkbox "V2ON" [checked] [ref=e124]
                    - text: V2ON
                - button [ref=e126] [cursor=pointer]
              - generic [ref=e130]:
                - button "Routes" [ref=e131] [cursor=pointer]
                - button "Concepts" [ref=e132] [cursor=pointer]
              - generic [ref=e133]:
                - generic [ref=e134]: Select players to assign
                - button "AI Suggestions" [ref=e135] [cursor=pointer]
              - generic [ref=e138]:
                - button "All" [ref=e139] [cursor=pointer]
                - button "Short" [ref=e140] [cursor=pointer]
                - button "Medium" [ref=e141] [cursor=pointer]
                - button "Deep" [ref=e142] [cursor=pointer]
                - button "Exotic" [ref=e143] [cursor=pointer]
            - generic [ref=e145]:
              - generic "Flat" [ref=e146]:
                - button [ref=e147] [cursor=pointer]
              - generic "Slant" [ref=e153]:
                - button [ref=e154] [cursor=pointer]
              - generic "Out" [ref=e160]:
                - button [ref=e161] [cursor=pointer]
              - generic "In/Dig" [ref=e167]:
                - button [ref=e168] [cursor=pointer]
              - generic "Curl" [ref=e174]:
                - button [ref=e175] [cursor=pointer]
              - generic "Comeback" [ref=e181]:
                - button [ref=e182] [cursor=pointer]
              - generic "Post" [ref=e188]:
                - button [ref=e189] [cursor=pointer]
              - generic "Corner" [ref=e195]:
                - button [ref=e196] [cursor=pointer]
              - generic "Wheel" [ref=e202]:
                - button [ref=e203] [cursor=pointer]
              - generic "Go/Fade" [ref=e208]:
                - button [ref=e209] [cursor=pointer]
              - generic "Whip" [ref=e215]:
                - button [ref=e216] [cursor=pointer]
              - generic "Sluggo" [ref=e222]:
                - button [ref=e223] [cursor=pointer]
              - generic "Jerk" [ref=e229]:
                - button [ref=e230] [cursor=pointer]
  - generic [ref=e236]:
    - heading "Animation Controls" [level=2] [ref=e238]
    - generic [ref=e245]:
      - button "Play (Space)" [ref=e246] [cursor=pointer]
      - slider [ref=e250] [cursor=pointer]: "0"
      - button "Toggle Canvas Inspector" [ref=e251] [cursor=pointer]
  - generic [ref=e254]:
    - button "Select Tool (S)" [ref=e255] [cursor=pointer]
    - button "Draw Route (R)" [ref=e259] [cursor=pointer]
    - button "Pen Tool (P)" [ref=e266] [cursor=pointer]
    - button "Delete Selection (Del)" [ref=e270] [cursor=pointer]
    - button "Toggle Grid (G)" [ref=e274] [cursor=pointer]
    - button "Undo (Cmd+Z)" [active] [ref=e279] [cursor=pointer]
    - button "Redo (Cmd+Y)" [ref=e283] [cursor=pointer]
```

# Test source

```ts
  70  | test('long coaching notes continue onto additional PDF pages without truncation', async ({page},info) => {
  71  |   const touch = info.project.name==='tablet-touch';
  72  |   await press(page,'Package',touch); await press(page,'Export',touch);
  73  |   const pending = page.waitForEvent('download'); await press(page,'Export as PDF',touch);
  74  |   const download = await pending;
  75  |   const file = `docs/evidence/core-workflows/${info.project.name}-long-notes.pdf`; await download.saveAs(file);
  76  |   const task = getDocument({data:new Uint8Array(fs.readFileSync(file)),useSystemFonts:true});
  77  |   const pdf = await task.promise; expect(pdf.numPages).toBeGreaterThan(1);
  78  |   let text = '';
  79  |   for(let i=1;i<=pdf.numPages;i++) {
  80  |     const content = await (await pdf.getPage(i)).getTextContent();
  81  |     text += content.items.filter(v=>'str' in v).map(v=>'str' in v?v.str:'').join(' ');
  82  |   }
  83  |   expect(text).toContain('NOTE-0:'); expect(text).toContain('NOTE-79:'); await task.destroy();
  84  | });
  85  | 
  86  | async function saved(page: Page): Promise<Playbook> {
  87  |   return page.evaluate(() => {
  88  |     const book = JSON.parse(localStorage.getItem('coachcore-playbook') ?? '{}');
  89  |     const w = window as any; const r = book?.plays?.['qa-play-a']?.routes?.[0];
  90  |     if (w.__t) w.__t.push({t: performance.now(), ev: 'test-read', depth: r?.depthYds, flipped: r?.isFlipped, p0x: r?.points?.[0]?.x});
  91  |     return book;
  92  |   });
  93  | }
  94  | 
  95  | test('renders real canvas and complete synthetic play', async ({ page }, info) => {
  96  |   await expect(page.getByRole('button', {name:'Collapse Tools & Inspector'})).toBeInViewport();
  97  |   expect((await saved(page)).plays['qa-play-a'].routes).toHaveLength(1);
  98  |   await page.screenshot({path:`docs/evidence/core-workflows/${info.project.name}-initial.png`});
  99  | });
  100 | 
  101 | async function coords(page: Page, x: number, y: number) {
  102 |   return page.evaluate(({x,y}) => {
  103 |     const stage = (window as unknown as {Konva:{stages:Konva.Stage[]}}).Konva.stages[0];
  104 |     const point = stage.getAbsoluteTransform().point({x,y});
  105 |     const box = stage.container().getBoundingClientRect();
  106 |     return {x:point.x+box.left,y:point.y+box.top};
  107 |   }, {x,y});
  108 | }
  109 | async function gesture(page: Page, from: {x:number;y:number}, to: {x:number;y:number}, touch: boolean) {
  110 |   if (touch) {
  111 |     const session = await page.context().newCDPSession(page);
  112 |     await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...from,id:1}]});
  113 |     for (let i=1;i<=10;i++) await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+(to.x-from.x)*i/10,y:from.y+(to.y-from.y)*i/10,id:1}]});
  114 |     await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  115 |     await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  116 |     await session.detach();
  117 |   } else {
  118 |     await page.mouse.move(from.x,from.y); await page.mouse.down();
  119 |     await page.mouse.move(to.x,to.y,{steps:12}); await page.mouse.up();
  120 |   }
  121 | }
  122 | async function press(page: Page, label: string, touch: boolean) {
  123 |   const button = page.getByRole('button',{name:label,exact:true});
  124 |   if (touch) await button.tap(); else await button.click();
  125 | }
  126 | async function checkpoint(page: Page) {
  127 |   await expect(page.getByText('Unsaved changes',{exact:true}).or(page.getByText('Saved',{exact:true}))).toBeVisible();
  128 |   const save = page.getByRole('button',{name:'Save Now'});
  129 |   if (await save.isEnabled()) await save.click();
  130 |   await expect(page.getByText('Saved',{exact:true})).toBeVisible();
  131 | }
  132 | 
  133 | test('native mouse/touch player drag undo redo and reload preserve complete play', async ({page}, info) => {
  134 |   const touch = info.project.name === 'tablet-touch';
  135 |   await press(page,'Collapse Tools & Inspector',touch);
  136 |   const before = (await saved(page)).plays['qa-play-a'];
  137 |   const player = before.players[0];
  138 |   await gesture(page, await coords(page,player.x,player.y), await coords(page,player.x+48,player.y+24),touch);
  139 |   await expect(page.getByRole('button',{name:'Undo (Cmd+Z)'})).toBeEnabled();
  140 |   await checkpoint(page);
  141 |   const moved = (await saved(page)).plays['qa-play-a'];
  142 |   expect(moved.players[0].x).not.toBe(player.x);
  143 |   await press(page,'Undo (Cmd+Z)',touch); await checkpoint(page);
  144 |   expect((await saved(page)).plays['qa-play-a']).toEqual(before);
  145 |   await press(page,'Redo (Cmd+Y)',touch); await checkpoint(page);
  146 |   expect((await saved(page)).plays['qa-play-a']).toEqual(moved);
  147 |   await page.reload(); await expect(page.locator('canvas').first()).toBeVisible();
  148 |   expect((await saved(page)).plays['qa-play-a']).toEqual(moved);
  149 |   await page.screenshot({path:`docs/evidence/core-workflows/${info.project.name}-drag.png`});
  150 | });
  151 | 
  152 | test('real route waypoint drag and property transactions undo redo', async ({page}, info) => {
  153 |   const touch = info.project.name === 'tablet-touch';
  154 |   await press(page,'Collapse Tools & Inspector',touch);
  155 |   const before = (await saved(page)).plays['qa-play-a'].routes[0];
  156 |   const select = await coords(page,828,282.4);
  157 |   if (touch) await page.touchscreen.tap(select.x,select.y); else await page.mouse.click(select.x,select.y);
  158 |   const endpoint = before.points[0];
  159 |   await gesture(page, await coords(page,endpoint.x,endpoint.y),await coords(page,endpoint.x+36,endpoint.y+48),touch);
  160 |   await checkpoint(page);
  161 |   const moved = (await saved(page)).plays['qa-play-a'].routes[0]; expect(moved.points).not.toEqual(before.points);
  162 |   await press(page,'Undo (Cmd+Z)',touch); await checkpoint(page); expect((await saved(page)).plays['qa-play-a'].routes[0]).toEqual(before);
  163 |   await press(page,'Redo (Cmd+Y)',touch); await checkpoint(page); expect((await saved(page)).plays['qa-play-a'].routes[0]).toEqual(moved);
  164 |   await press(page,'Expand Tools & Inspector',touch);
  165 |   await page.getByRole('button',{name:'Design',exact:true}).last().click();
  166 |   await expect(page.getByLabel('Depth (yds)',{exact:true})).toBeVisible();
  167 |   await page.getByLabel('Depth (yds)',{exact:true}).fill('20');
  168 |   await page.getByLabel('Depth (yds)',{exact:true}).press('Tab'); await checkpoint(page);
  169 |   const changed = (await saved(page)).plays['qa-play-a'].routes[0]; expect(changed.depthYds).toBe(20);
> 170 |   await press(page,'Undo (Cmd+Z)',touch); await checkpoint(page); expect((await saved(page)).plays['qa-play-a'].routes[0]).toEqual(moved);
      |                                                                                                                            ^ Error: expect(received).toEqual(expected) // deep equality
  171 |   await press(page,'Redo (Cmd+Y)',touch); await checkpoint(page); expect((await saved(page)).plays['qa-play-a'].routes[0]).toEqual(changed);
  172 |   await press(page,'Flip Horizontal',touch); await checkpoint(page);
  173 |   expect((await saved(page)).plays['qa-play-a'].routes[0].isFlipped).toBe(true);
  174 |   await press(page,'Undo (Cmd+Z)',touch); await checkpoint(page);
  175 |   expect((await saved(page)).plays['qa-play-a'].routes[0]).toEqual(changed);
  176 |   await page.screenshot({path:`docs/evidence/core-workflows/${info.project.name}-route.png`});
  177 | });
  178 | 
  179 | test('downloaded single and install PDFs have diagrams and all play labels without changing selection', async ({page},info) => {
  180 |   const touch = info.project.name === 'tablet-touch';
  181 |   await press(page,'Collapse Playbook',touch);
  182 |   // Pan the real field before export; exported geometry must remain complete.
  183 |   await gesture(page,await coords(page,150,100),await coords(page,500,350),touch);
  184 |   await press(page,'Package',touch);
  185 |   await expect(page.getByRole('heading',{name:'Package',exact:true})).toBeVisible();
  186 |   await press(page,'Export',touch);
  187 |   const before = await saved(page);
  188 |   for (const [label, suffix] of [['Export as PDF','play'],['Export Install Book','install']] as const) {
  189 |     const downloadPromise = page.waitForEvent('download'); await press(page,label,touch);
  190 |     const download = await downloadPromise;
  191 |     const path = `docs/evidence/core-workflows/${info.project.name}-${suffix}.pdf`; await download.saveAs(path);
  192 |     const task = getDocument({data:new Uint8Array(fs.readFileSync(path)),useSystemFonts:true});
  193 |     const pdf = await task.promise;
  194 |     expect(pdf.numPages).toBe(suffix === 'install' ? 3 : 1);
  195 |     let text = '', images = 0;
  196 |     for(let n=1;n<=pdf.numPages;n++) {
  197 |       const page = await pdf.getPage(n); const content = await page.getTextContent();
  198 |       text += content.items.filter(i => 'str' in i).map(i => 'str' in i ? i.str : '').join(' ');
  199 |       const ops = await page.getOperatorList();
  200 |       for(let i=0;i<ops.fnArray.length;i++) if(ops.fnArray[i]===OPS.paintImageXObject) {
  201 |         images++;
  202 |         const image = page.objs.get(ops.argsArray[i][0]) as {width:number;height:number;data:Uint8Array;kind:number};
  203 |         expect(image.width).toBe(1440); expect(image.height).toBe(640);
  204 |         const stride = image.kind===ImageKind.RGBA_32BPP ? 4 : 3;
  205 |         let offense=0, defense=0;
  206 |         for(let p=0;p<image.data.length;p+=stride) {
  207 |           if(image.data[p]===1 && image.data[p+1]===115 && image.data[p+2]===178) offense++;
  208 |           if(image.data[p]===222 && image.data[p+1]===143 && image.data[p+2]===5) defense++;
  209 |         }
  210 |         expect(offense).toBeGreaterThan(100); expect(defense).toBeGreaterThan(100);
  211 |       }
  212 |     }
  213 |     expect(text).toContain('QA Complete Alpha');
  214 |     if(suffix==='install') expect(text).toContain('QA Complete Bravo');
  215 |     expect(images).toBe(suffix==='install'?2:1);
  216 |     await task.destroy();
  217 |   }
  218 |   await press(page,'Expand Playbook',touch);
  219 |   expect(await saved(page)).toEqual(before);
  220 |   await expect(page.getByRole('button',{name:'QA Complete Alpha',exact:true})).toHaveAttribute('aria-pressed','true');
  221 |   await expect(page.getByRole('button',{name:'Export Install Book'})).toBeEnabled();
  222 | });
  223 | 
  224 | test('cancel route drawing preserves existing route; replacement is one undoable action', async ({page},info) => {
  225 |   const touch = info.project.name==='tablet-touch';
  226 |   await press(page,'Collapse Tools & Inspector',touch);
  227 |   const before = (await saved(page)).plays['qa-play-a'];
  228 |   const player = before.players[0];
  229 |   const tap = async (x:number,y:number) => {
  230 |     const p = await coords(page,x,y);
  231 |     if(touch) await page.touchscreen.tap(p.x,p.y); else await page.mouse.click(p.x,p.y);
  232 |   };
  233 |   await press(page,'Draw Route (R)',touch);
  234 |   await tap(player.x,player.y);
  235 |   if(touch) await press(page,'Cancel route',touch); else await page.keyboard.press('Escape');
  236 |   expect((await saved(page)).plays['qa-play-a']).toEqual(before);
  237 |   await tap(player.x,player.y); await tap(player.x+144,player.y+72);
  238 |   if(touch) await press(page,'Finish route',touch);
  239 |   else { await page.getByRole('application').focus(); await page.keyboard.press('Enter'); }
  240 |   await checkpoint(page);
  241 |   const after = (await saved(page)).plays['qa-play-a'];
  242 |   expect(after.players).toEqual(before.players); expect(after.routes).toHaveLength(1);
  243 |   expect(after.routes[0].treeId).toBeNull(); expect(after.routes[0].points).not.toEqual(before.routes[0].points);
  244 |   await press(page,'Undo (Cmd+Z)',touch); await checkpoint(page);
  245 |   expect((await saved(page)).plays['qa-play-a']).toEqual(before);
  246 | });
  247 | 
  248 | test('create save reopen and switch complete plays without loss', async ({page},info) => {
  249 |   const touch = info.project.name==='tablet-touch';
  250 |   const original = await saved(page);
  251 |   await press(page,'Add Play',touch);
  252 |   await page.getByLabel('Play Name',{exact:true}).fill('QA New Coach Play');
  253 |   await page.getByLabel('Situation',{exact:true}).fill('Goal line');
  254 |   await page.getByLabel('Tags (comma separated)').fill('QA, Sprint');
  255 |   await press(page,'Create Play',touch); await checkpoint(page);
  256 |   const created = await saved(page);
  257 |   expect(Object.keys(created.plays)).toHaveLength(3);
  258 |   expect(created.plays['qa-play-a']).toEqual(original.plays['qa-play-a']);
  259 |   expect(created.plays['qa-play-b']).toEqual(original.plays['qa-play-b']);
  260 |   const play = Object.values(created.plays).find(p=>p.name==='QA New Coach Play');
  261 |   expect(play?.routes).toEqual([]); expect(play?.players.length).toBeGreaterThan(0);
  262 |   expect(play?.tags).toEqual(['QA','Sprint']);
  263 |   await page.reload();
  264 |   await press(page,'QA New Coach Play',touch);
  265 |   await expect(page.getByRole('button',{name:'QA New Coach Play',exact:true})).toHaveAttribute('aria-pressed','true');
  266 |   await press(page,'QA Complete Bravo',touch);
  267 |   await expect(page.getByRole('button',{name:'QA Complete Bravo',exact:true})).toHaveAttribute('aria-pressed','true');
  268 |   expect(await saved(page)).toEqual(created);
  269 | });
  270 | 
```