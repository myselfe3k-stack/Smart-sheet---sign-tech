// Minimal .xlsx writer: one worksheet, bold frozen header with autofilter, optional per-row fill colors.
import { strToU8, zipSync } from 'fflate'

const esc = (v) =>
  String(v)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const colName = (i) => {
  let s = ''
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

const argb = (hex) => `FF${hex.replace('#', '').toUpperCase()}`

/**
 * @param {string[]} headers
 * @param {{ cells: (string|number|null)[], color?: string|null }[]} rows
 */
export function buildXlsx(headers, rows, sheetName = 'Sheet1') {
  // One fill + cell style per distinct row color. Style 0 = default, 1 = header.
  const colors = [...new Set(rows.map((r) => r.color).filter((c) => c && c.toUpperCase() !== '#FFFFFF'))]
  const styleFor = (color) => (color && colors.includes(color) ? 2 + colors.indexOf(color) : 0)

  const fills = [
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>',
    `<fill><patternFill patternType="solid"><fgColor rgb="${argb('#F3F4F6')}"/></patternFill></fill>`,
    ...colors.map((c) => `<fill><patternFill patternType="solid"><fgColor rgb="${argb(c)}"/></patternFill></fill>`),
  ]
  const xfs = [
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>',
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>',
    ...colors.map((_, i) => `<xf numFmtId="0" fontId="0" fillId="${3 + i}" borderId="1" xfId="0" applyFill="1" applyBorder="1"/>`),
  ]
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="${fills.length}">${fills.join('')}</fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFE5E7EB"/></left><right style="thin"><color rgb="FFE5E7EB"/></right><top style="thin"><color rgb="FFE5E7EB"/></top><bottom style="thin"><color rgb="FFE5E7EB"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>
</styleSheet>`

  const cell = (value, ref, s) => {
    if (value === null || value === undefined || value === '') return `<c r="${ref}" s="${s}"/>`
    if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}" s="${s}"><v>${value}</v></c>`
    return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`
  }
  const sheetRows = [
    `<row r="1">${headers.map((h, i) => cell(h, `${colName(i)}1`, 1)).join('')}</row>`,
    ...rows.map((r, ri) => {
      const s = styleFor(r.color)
      return `<row r="${ri + 2}">${headers.map((_, ci) => cell(r.cells[ci], `${colName(ci)}${ri + 2}`, s)).join('')}</row>`
    }),
  ]
  const widths = headers.map((h, i) =>
    Math.min(60, Math.max(10, String(h).length + 4, ...rows.map((r) => String(r.cells[i] ?? '').length + 2))),
  )
  const last = `${colName(Math.max(0, headers.length - 1))}${rows.length + 1}`
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>
<sheetData>${sheetRows.join('')}</sheetData>
<autoFilter ref="A1:${last}"/>
</worksheet>`

  const safeName = esc(sheetName.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Sheet1')
  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${safeName}" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${safeName.replace(/'/g, "''")}'!$A$1:$${colName(Math.max(0, headers.length - 1))}$${rows.length + 1}</definedName></definedNames></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/worksheets/sheet1.xml': sheet,
    'xl/styles.xml': styles,
  }
  return zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])), { level: 6 })
}

export function downloadXlsx(filename, bytes) {
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
