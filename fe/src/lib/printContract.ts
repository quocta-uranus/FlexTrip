import type { Contract } from '@/types/contract';

export function printContract(contract: Contract, travelerName: string, providerName: string) {
  const fmt = (n: number) => n.toLocaleString('vi-VN');

  const penaltyTable =
    contract.penaltyRules && contract.penaltyRules.length > 0
      ? `
        <table>
          <thead>
            <tr>
              <th>Loại thiệt hại</th>
              <th>Mô tả</th>
              <th style="text-align:right">Mức phạt (₫)</th>
            </tr>
          </thead>
          <tbody>
            ${contract.penaltyRules
              .map(
                (r) => `
              <tr>
                <td>${r.item}</td>
                <td>${r.description}</td>
                <td style="text-align:right">${
                  r.minAmount === r.maxAmount
                    ? fmt(r.minAmount)
                    : `${fmt(r.minAmount)} – ${fmt(r.maxAmount)}`
                }</td>
              </tr>`,
              )
              .join('')}
          </tbody>
        </table>`
      : '<p style="color:#666;font-style:italic">Hai bên tự thỏa thuận khi phát sinh thiệt hại.</p>';

  const conditionBox = contract.productConditionNote
    ? `<div class="condition-box">
        <strong>Tình trạng sản phẩm (Provider khai báo):</strong><br/>
        ${contract.productConditionNote}
       </div>`
    : '';

  const highValueBadge = contract.isHighValue
    ? `<span class="badge">Tài sản giá trị cao</span>`
    : '';

  const sigFmt = (d: string | null) =>
    d ? new Date(d).toLocaleString('vi-VN') : '________________';

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Hợp đồng thuê thiết bị – FlexTrip</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 13pt;
      line-height: 1.6;
      color: #111;
      padding: 20mm 18mm;
      max-width: 210mm;
      margin: 0 auto;
    }

    /* Header */
    .header { text-align: center; margin-bottom: 24px; }
    .header .logo { font-weight: 700; font-size: 11pt; letter-spacing: 2px; color: #2a7bd9; margin-bottom: 4px; }
    .header h1 { font-size: 16pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    .header .subtitle { font-size: 10pt; color: #555; margin-top: 4px; }

    /* Badge */
    .badge {
      display: inline-block;
      background: #fef3c7;
      color: #b45309;
      font-size: 9pt;
      font-weight: 700;
      padding: 2px 10px;
      border-radius: 20px;
      border: 1px solid #fcd34d;
      margin-top: 6px;
    }

    /* Divider */
    hr { border: none; border-top: 1px solid #ccc; margin: 16px 0; }

    /* Parties */
    .parties { display: flex; gap: 32px; margin-bottom: 20px; }
    .party { flex: 1; border: 1px solid #dce8f5; border-radius: 6px; padding: 12px 16px; background: #f8fbff; }
    .party .role { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #5a6b85; margin-bottom: 4px; }
    .party .name { font-size: 13pt; font-weight: 700; }
    .party .signed { font-size: 9pt; color: #15803d; margin-top: 6px; }
    .party .unsigned { font-size: 9pt; color: #b45309; margin-top: 6px; }

    /* Condition box */
    .condition-box {
      background: #fff7ed;
      border: 1px solid #fed7aa;
      border-radius: 6px;
      padding: 10px 14px;
      font-size: 11pt;
      margin-bottom: 16px;
    }

    /* Penalty table */
    h2 { font-size: 12pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin: 20px 0 10px; color: #0f1729; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11pt; }
    th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #dce8f5; }
    td { padding: 8px 10px; border: 1px solid #e2e8f0; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fbff; }

    /* Contract body */
    .contract-body { margin-top: 20px; }
    .contract-body pre {
      white-space: pre-wrap;
      font-family: "Times New Roman", Times, serif;
      font-size: 12pt;
      line-height: 1.7;
      color: #111;
    }

    /* Signatures */
    .signatures { margin-top: 32px; display: flex; gap: 40px; }
    .sig-block { flex: 1; text-align: center; }
    .sig-block .role { font-size: 10pt; font-weight: 700; text-transform: uppercase; margin-bottom: 4px; }
    .sig-block .datetime { font-size: 10pt; color: #555; margin-bottom: 40px; }
    .sig-block .line { border-top: 1px solid #333; padding-top: 6px; font-size: 11pt; font-weight: 700; }

    /* Footer */
    .footer { margin-top: 32px; text-align: center; font-size: 9pt; color: #999; border-top: 1px solid #eee; padding-top: 12px; }

    @media print {
      body { padding: 12mm 14mm; }
      @page { size: A4; margin: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>

  <div class="no-print" style="background:#2a7bd9;color:#fff;text-align:center;padding:10px 0;font-family:sans-serif;font-size:13px;cursor:pointer;margin:-20mm -18mm 16px;" onclick="window.print()">
    🖨️ Nhấn để in / Lưu PDF  &nbsp;&nbsp;|&nbsp;&nbsp; Ctrl+P (Windows) / ⌘+P (Mac)
  </div>

  <div class="header">
    <div class="logo">FLEXTRIP</div>
    <h1>Hợp đồng thuê thiết bị</h1>
    <div class="subtitle">Mã hợp đồng: ${contract.id.slice(-12).toUpperCase()}</div>
    ${highValueBadge}
  </div>

  <hr/>

  <div class="parties">
    <div class="party">
      <div class="role">Bên A – Người cho thuê</div>
      <div class="name">${providerName}</div>
      <div class="${contract.providerSignedAt ? 'signed' : 'unsigned'}">
        ${contract.providerSignedAt ? '✓ Đã ký: ' + sigFmt(contract.providerSignedAt) : '⏳ Chưa ký'}
      </div>
    </div>
    <div class="party">
      <div class="role">Bên B – Người thuê</div>
      <div class="name">${travelerName}</div>
      <div class="${contract.travelerSignedAt ? 'signed' : 'unsigned'}">
        ${contract.travelerSignedAt ? '✓ Đã ký: ' + sigFmt(contract.travelerSignedAt) : '⏳ Chưa ký'}
      </div>
    </div>
  </div>

  ${conditionBox}

  ${
    contract.penaltyRules && contract.penaltyRules.length > 0
      ? `<h2>Bảng mức phạt thiệt hại</h2>${penaltyTable}`
      : ''
  }

  <div class="contract-body">
    <pre>${contract.terms}</pre>
  </div>

  <div class="signatures">
    <div class="sig-block">
      <div class="role">Bên A (Người cho thuê)</div>
      <div class="datetime">${sigFmt(contract.providerSignedAt)}</div>
      <div class="line">${providerName}</div>
    </div>
    <div class="sig-block">
      <div class="role">Bên B (Người thuê)</div>
      <div class="datetime">${sigFmt(contract.travelerSignedAt)}</div>
      <div class="line">${travelerName}</div>
    </div>
  </div>

  <div class="footer">
    Hợp đồng được ký điện tử trên nền tảng FlexTrip · Có giá trị pháp lý theo Luật Giao dịch điện tử Việt Nam · flextrip.vn
  </div>

</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=750');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  // Delay để đảm bảo font load xong
  setTimeout(() => win.print(), 400);
}
