import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Structural guard for this project's plain CSS. Quoted values and functions are
// scanned as units so orphan declarations cannot silently swallow a later rule.
function scan(text, separator) {
  let quote='', parentheses=0;
  for (let i=0;i<text.length;i++) {
    const c=text[i];
    if (quote) {if(c==='\\') i++; else if(c===quote) quote='';continue;}
    if(c==='"'||c==="'") {quote=c;continue;}
    if(c==='(') parentheses++;
    if(c===')') parentheses--;
    assert.ok(parentheses>=0,'Unbalanced CSS function');
    if(!parentheses && separator(c)) return i;
  }
  assert.equal(quote,'','Unclosed CSS string');
  assert.equal(parentheses,0,'Unclosed CSS function');
  return -1;
}

test('CSS has valid block structure and one selector per media condition', async () => {
  const css=(await readFile(new URL('../src/styles/app.css',import.meta.url),'utf8')).replace(/\/\*[\s\S]*?\*\//g,'');
  const selectors=new Set();
  let styleCount=0;
  function walk(input,context=[]) {
    let rest=input.trim();
    while(rest) {
      const start=scan(rest,c=>c==='{');
      assert.ok(start>0,`Orphan CSS: ${rest.slice(0,100)}`);
      const head=rest.slice(0,start).trim();
      assert.doesNotMatch(head,/[;}]/,`Invalid rule header: ${head}`);
      let depth=1,pos=start+1;
      while(depth) {
        const offset=scan(rest.slice(pos),c=>c==='{'||c==='}');
        assert.ok(offset>=0,`Unclosed block: ${head}`);
        pos+=offset;
        depth+=rest[pos]==='{'?1:-1;
        pos++;
      }
      const body=rest.slice(start+1,pos-1);
      rest=rest.slice(pos).trim();
      if(head.startsWith('@media ')||head.startsWith('@keyframes ')) {
        walk(body,[...context,head.replace(/\s+/g,' ')]);
        continue;
      }
      assert.ok(!head.startsWith('@'),`Unsupported at-rule: ${head}`);
      const key=[...context,head].join('|');
      assert.ok(!selectors.has(key),`Repeated selector: ${key}`);
      selectors.add(key);styleCount++;
      const props=new Set();
      let declarations=body.trim();
      assert.ok(declarations,`Empty rule: ${head}`);
      while(declarations) {
        const end=scan(declarations,c=>c===';');
        assert.ok(end>=0,`Missing semicolon: ${head}`);
        const declaration=declarations.slice(0,end).trim();
        declarations=declarations.slice(end+1).trim();
        const colon=declaration.indexOf(':');
        assert.ok(colon>0,`Invalid declaration: ${declaration}`);
        const property=declaration.slice(0,colon).trim();
        assert.match(property,/^(?:--[\w-]+|-?[a-z][a-z0-9-]*)$/);
        assert.ok(declaration.slice(colon+1).trim(),`Empty value: ${head} ${property}`);
        assert.ok(!props.has(property),`Repeated property: ${head} ${property}`);
        props.add(property);
      }
    }
  }
  walk(css);
  assert.ok(styleCount>100,'Expected the complete component stylesheet');
});
