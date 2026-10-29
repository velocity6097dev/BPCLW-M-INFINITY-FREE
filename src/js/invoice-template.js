/* ══════════════════════════════════════════════
   INVOICE (PDF page 1 content) — matches the dealer's actual
   tax-invoice format: fixed BPCL consignee/billing blocks, one
   line item per MPD row (mpd-rows.js).
   ══════════════════════════════════════════════ */
function handleLetterheadLogoError(imgEl){
  const box = imgEl.parentElement;
  if(box) box.innerHTML = DEFAULT_LOGO_MARK_HTML;
}

function buildInvoiceHTML(){
  const stationName = ($('stationName').value.trim() || 'BAHAR SERVICE STATION').toUpperCase();
  const dealerCode = $('dealerCode').value.trim();
  const vendorCode = $('vendorCode').value.trim();
  const gstin = $('gstin').value.trim().toUpperCase();
  const panNo = $('panNo').value.trim();
  const logoUrl = BPCL_LOGO_URL.trim();
  const invoiceNo = $('invoiceNo').value.trim() || 'N/A';
  const invoiceDate = $('invoiceDate').value;
  const stampDate = $('stampDate').value;
  const wmCertNo = $('wmCertNo').value.trim();
  const wmCertDate = $('wmCertDate').value;
  const grnNo = $('grnNo').value.trim();
  const grnDate = $('grnDate').value;
  const mpdRows = getMpdRows();
  const mpdMakeSerial = mpdRows.map(r=>{
    if(!r.serial && !r.model) return null;
    return r.serial ? (r.model ? `${r.model}-${r.serial}` : r.serial) : r.model;
  }).filter(Boolean).join(', ') || 'N/A';
  const nozzles = mpdRows.reduce((sum,r)=> sum + r.nozzles, 0);
  const rate = parseFloat($('mpdRate').value) || 0;
  const stampingFee = nozzles * rate;
  const addl = parseFloat($('addlAmt').value) || 0;
  const total = stampingFee + addl;
  const year = getFinancialYear(stampDate);
  const hasExtraDoc = !!(images.extra && images.extra.length && extraDocType);

  // One line item per machine — descriptions only call out "Machine N" once
  // there's more than one, so a single-MPD invoice reads exactly as before.
  const mpdLineRows = mpdRows.map((r,idx)=>{
    const amount = r.nozzles * rate;
    const desc = mpdRows.length > 1
      ? `Stamping fee for the year ${year} (Machine ${idx+1}: ${[r.model,r.serial].filter(Boolean).join(' ')||'N/A'})`
      : `Stamping fee for the year ${year}`;
    return `
      <tr>
        <td style="border:1px solid #000;padding:8px 7px;text-align:center;">${idx+1}</td>
        <td style="border:1px solid #000;padding:8px 7px;text-align:center;">996211</td>
        <td style="border:1px solid #000;padding:8px 7px;">${desc}</td>
        <td style="border:1px solid #000;padding:8px 7px;text-align:center;">${r.nozzles}</td>
        <td style="border:1px solid #000;padding:8px 7px;text-align:right;">${rate.toFixed(2)}</td>
        <td style="border:1px solid #000;padding:8px 7px;text-align:right;">${amount.toFixed(2)}</td>
      </tr>`;
  }).join('');

  const addlRow = addl>0 ? `
      <tr>
        <td style="border:1px solid #000;padding:8px 7px;text-align:center;">${mpdRows.length+1}</td>
        <td style="border:1px solid #000;padding:8px 7px;text-align:center;">996211</td>
        <td style="border:1px solid #000;padding:8px 7px;">Additional Charges / Conveyance</td>
        <td style="border:1px solid #000;padding:8px 7px;text-align:center;">1</td>
        <td style="border:1px solid #000;padding:8px 7px;text-align:right;">${addl.toFixed(2)}</td>
        <td style="border:1px solid #000;padding:8px 7px;text-align:right;">${addl.toFixed(2)}</td>
      </tr>` : '';

  return `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:11.5px;color:#000;background:#fff;width:794px;padding:34px 44px;line-height:1.5;">

  <!-- ── Station Letterhead — white, matches the paper. Logo pinned left with a matching spacer
       on the right so the pump details sit truly centered on the page, like a formal letterhead.
       Thick blue rule below separates it from the invoice frame. ── -->
  <div style="padding:0 2px 18px;">
    <div style="display:grid;grid-template-columns:112px 1fr 112px;align-items:center;gap:18px;">
      <div style="position:relative;width:112px;height:122px;background:#fff;">
        ${logoUrl
          ? `<img src="${escAttr(logoUrl)}" alt="Logo" crossorigin="anonymous" referrerpolicy="no-referrer" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;" onerror="handleLetterheadLogoError(this)">`
          : DEFAULT_LOGO_MARK_HTML}
      </div>
      <div style="text-align:center;">
        <div style="font-size:25px;font-weight:800;color:#10233F;letter-spacing:.3px;">M/S. ${stationName}</div>
        <div style="font-size:14px;font-weight:700;color:#161616;margin-top:5px;letter-spacing:.2px;">DEALER: BHARAT PETROLEUM CORP LTD.</div>
        <div style="display:flex;justify-content:center;gap:28px;margin-top:8px;font-size:12.5px;">
          <div><strong>GSTIN:</strong> ${gstin||'N/A'}</div>
          <div><strong>PAN NO:</strong> ${panNo||'N/A'}</div>
        </div>
      </div>
      <div></div>
    </div>
    <div style="height:5px;background:#17325B;border-radius:2px;margin-top:16px;"></div>
  </div>

  <!-- ── Main document frame — one continuous box, matches the reference invoice ── -->
  <div style="border:2px solid #000;">

    <div style="text-align:center;font-size:19px;font-weight:800;letter-spacing:1.5px;padding:14px 0 12px;border-bottom:1px solid #000;">INVOICE</div>

    <!-- meta table -->
    <table style="width:100%;border-collapse:collapse;font-size:11.5px;">
      <tr>
        <td style="border:1px solid #000;padding:9px 14px;width:50%;"><strong>INVOICE NO:</strong>&nbsp; ${invoiceNo}</td>
        <td style="border:1px solid #000;padding:9px 14px;"><strong>VENDOR CODE :</strong>&nbsp; ${vendorCode||'N/A'}</td>
      </tr>
      <tr>
        <td style="border:1px solid #000;padding:9px 14px;"><strong>INVOICE DATE:</strong>&nbsp; ${fmtDate(invoiceDate)}</td>
        <td style="border:1px solid #000;padding:9px 14px;"><strong>GSTN NO :</strong>&nbsp; ${gstin||'N/A'}</td>
      </tr>
      <tr>
        <td style="border:1px solid #000;padding:9px 14px;"><strong>MPD MAKE / SR NO:</strong>&nbsp; ${mpdMakeSerial}</td>
        <td style="border:1px solid #000;padding:9px 14px;"><strong>PAN NO :</strong>&nbsp; ${panNo||'N/A'}</td>
      </tr>
    </table>

    <div style="text-align:center;font-weight:700;text-decoration:underline;font-size:12.5px;padding:14px 0;">Subject: Reimbursement of Stamping Fee</div>

    <!-- consignee / billing address box -->
    <table style="width:100%;border-collapse:collapse;font-size:11px;">
      <tr>
        <td style="border:1px solid #000;padding:11px 14px;width:50%;vertical-align:top;">
          <div style="font-weight:700;margin-bottom:5px;">Consignee/Buyer Address:</div>
          <div style="font-weight:700;">Bharat Petroleum Corporation Limited</div>
          <div style="line-height:1.65;">Bharat Bhavan, Plot No.31<br>Prince Gulam Md.Shah Road,<br>Golf Green, Kolkata-700095</div>
        </td>
        <td style="border:1px solid #000;padding:11px 14px;vertical-align:top;">
          <div style="font-weight:700;margin-bottom:5px;">Billing Address:</div>
          <div style="font-weight:700;">M/s Bharat Petroleum Corporation Limited</div>
          <div style="line-height:1.65;">Business Excellence center (BPEC)<br>Plot No.6, Sector-2<br>Behind CIDCO Garden. Kahargar,<br>NAVI MUMBAI-410210</div>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="border:1px solid #000;padding:8px 14px;font-weight:700;">BPCL PAN NO:${BPCL_PAN}&nbsp;&nbsp;&nbsp;&nbsp;GSTN : ${BPCL_GSTN}</td>
      </tr>
    </table>

    <!-- item table -->
    <table style="width:100%;border-collapse:collapse;font-size:11px;">
      <tr>
        <td style="border:1px solid #000;padding:7px;font-weight:700;width:8%;text-align:center;">SR NO.</td>
        <td style="border:1px solid #000;padding:7px;font-weight:700;width:11%;text-align:center;">HSN/SAC</td>
        <td style="border:1px solid #000;padding:7px;font-weight:700;">Description</td>
        <td style="border:1px solid #000;padding:7px;font-weight:700;width:9%;text-align:center;">QNTY</td>
        <td style="border:1px solid #000;padding:7px;font-weight:700;width:12%;text-align:center;">RATE</td>
        <td style="border:1px solid #000;padding:7px;font-weight:700;width:13%;text-align:center;">Amount</td>
      </tr>
      ${mpdLineRows}${addlRow}
    </table>

    <!-- amount-in-words + CGST / SGST / TOTAL -->
    <table style="width:100%;border-collapse:collapse;font-size:11px;">
      <tr>
        <td rowspan="3" style="border:1px solid #000;padding:10px 14px;font-weight:700;width:60%;vertical-align:middle;">(Rs. ${numWords(total)})</td>
        <td style="border:1px solid #000;padding:6px 14px;width:22%;">CGST</td>
        <td style="border:1px solid #000;padding:6px 14px;text-align:right;width:18%;">NA</td>
      </tr>
      <tr>
        <td style="border:1px solid #000;padding:6px 14px;">SGST</td>
        <td style="border:1px solid #000;padding:6px 14px;text-align:right;">NA</td>
      </tr>
      <tr>
        <td style="border:1px solid #000;padding:7px 14px;font-weight:800;">TOTAL</td>
        <td style="border:1px solid #000;padding:7px 14px;text-align:right;font-weight:800;">${total.toFixed(2)}</td>
      </tr>
    </table>

    <!-- enclosure -->
    <div style="border:1px solid #000;padding:10px 14px;font-size:11px;line-height:1.9;">
      <div style="font-weight:700;text-decoration:underline;margin-bottom:2px;">Enclosure:</div>
      <div>1.&nbsp; Original Receipt GRN No. ${grnNo||'N/A'}&nbsp;&nbsp;Dated: ${fmtDate(grnDate)}</div>
      <div>2.&nbsp; Original Certificate No- ${wmCertNo||'N/A'}&nbsp;&nbsp;Dated: ${fmtDate(wmCertDate)}</div>
      ${hasExtraDoc ? `<div>3.&nbsp; ${escAttr(extraDocType)}</div>` : ''}
    </div>

    <!-- signature -->
    <div style="border:1px solid #000;border-top:none;min-height:170px;padding:16px 20px;display:flex;justify-content:flex-end;">
      <div style="width:260px;text-align:center;">
        <div style="height:100px;"></div>
        <div style="font-weight:700;font-size:12px;white-space:nowrap;">For ${stationName}</div>
        <div style="font-size:10.5px;margin-top:4px;white-space:nowrap;">(Name/Signature/Seal of the Dealer)</div>
      </div>
    </div>

  </div>
</div>`;
}
