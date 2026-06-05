import * as pdfjsLib from './node_modules/pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
const data = new Uint8Array(fs.readFileSync('DnD_5E_CharacterSheet_FormFillable.pdf'));
const pdf = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
console.log('pages', pdf.numPages);
for (let p = 1; p <= Math.min(pdf.numPages, 3); p++) {
  const page = await pdf.getPage(p);
  const ann = await page.getAnnotations({ intent: 'display' });
  console.log('page', p, 'annotations', ann.length);
  for (const a of ann.slice(0, 80)) {
    if (a.subtype === 'Widget') console.log(JSON.stringify({ fieldName:a.fieldName, fieldType:a.fieldType, rect:a.rect, buttonValue:a.buttonValue, checkBox:a.checkBox, radioButton:a.radioButton, multiLine:a.multiLine }));
  }
}
