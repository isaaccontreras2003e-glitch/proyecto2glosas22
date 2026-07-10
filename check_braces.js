const fs = require('fs');
const content = fs.readFileSync('src/app/page.tsx', 'utf8');
const lines = content.split('\n');
let depth = 0;
let inString = false;
let strChar = '';
let inComment = false;
let inLineComment = false;

for(let i = 0; i < lines.length; i++) {
  const l = lines[i];
  for(let j = 0; j < l.length; j++) {
    const c = l[j];
    const next = l[j+1] || '';
    
    if(inLineComment) { break; } // skip rest of line
    
    if(inComment) {
      if(c === '*' && next === '/') { inComment = false; j++; }
      continue;
    }
    
    if(inString) {
      if(c === '\\') { j++; continue; }
      if(c === strChar) inString = false;
      continue;
    }
    
    if(c === '/' && next === '/') { inLineComment = true; break; }
    if(c === '/' && next === '*') { inComment = true; j++; continue; }
    if(c === '"' || c === "'" || c === '`') { inString = true; strChar = c; continue; }
    
    if(c === '{') depth++;
    else if(c === '}') depth--;
  }
  inLineComment = false;
  
  // Print lines where depth changes significantly
  if(i > 2820 || depth > 5) {
    // console.log(`Line ${i+1} depth=${depth}: ${l.substring(0,60)}`);
  }
}

console.log('Final depth:', depth);

// Now find where the imbalance starts - go line by line tracking max
let d2 = 0;
let lastHighLine = -1;
for(let i = 0; i < lines.length; i++) {
  const l = lines[i];
  let lDepthChange = 0;
  let iS = false, sC = '', iC = false, iLC = false;
  for(let j = 0; j < l.length; j++) {
    const c = l[j];
    const next = l[j+1] || '';
    if(iLC) break;
    if(iC) { if(c==='*'&&next==='/'){iC=false;j++;} continue; }
    if(iS) { if(c==='\\'){j++;continue;} if(c===sC)iS=false; continue; }
    if(c==='/'&&next==='/'){iLC=true;break;}
    if(c==='/'&&next==='*'){iC=true;j++;continue;}
    if(c==='"'||c==="'"||c==='`'){iS=true;sC=c;continue;}
    if(c==='{'){d2++;lDepthChange++;}
    else if(c==='}'){d2--;lDepthChange--;}
  }
  if(d2 > 0 && i > 2800) {
    console.log(`Line ${i+1} (depth=${d2}, change=${lDepthChange}): ${l.substring(0,80)}`);
  }
}
