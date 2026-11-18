import { createHash } from 'crypto';
import { PenaltyRule } from './dto/contract.dto';
import {
  CANCELLATION_POLICY, CATEGORY_NAMES, CLOSING, CONTRACT_TITLE, ID_TYPE_NAMES, INTRO, LEGAL_BASIS, NATION_HEADER,
} from './contract.content';
import { moneyInWords } from './vietnamese-number.util';

export type DocBlock =
  | { type: 'p'; text: string }
  | { type: 'sub'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'kv'; rows: Array<[string, string]> }
  | { type: 'table'; head: string[]; rows: string[][] }
  | { type: 'images'; urls: string[] };

export interface DocArticle { title: string; blocks: DocBlock[] }
export interface DocParty { heading: string; rows: Array<[string, string]> }

export interface ContractDocument {
  version: 2;
  title: string;
  nation: [string, string];
  number: string | null;
  issuedAt: string;
  basis: string[];
  opening: string;
  parties: [DocParty, DocParty];
  intro: string;
  articles: DocArticle[];
  closing: string;
  signers: [{ label: string; name: string }, { label: string; name: string }];
}

export interface PartyInput {
  name: string;
  displayName?: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  bankAccount?: string | null;
  idType?: string | null;
  idLast4?: string | null;
}

export interface ContractDocumentParams {
  number: string | null;
  issuedAt: Date;
  provider: PartyInput;
  traveler: PartyInput;
  listing: {
    title: string;
    category: string;
    location: string;
    marketValue?: number | null;
    conditionNote?: string | null;
    penaltyRules: PenaltyRule[];
  };
  booking: {
    quantity: number;
    startDate: Date;
    endDate: Date;
    rentalDays: number;
    unitPrice: number;
    totalPrice: number;
    depositAmount: number;
    discountAmount: number;
    depositPercent: number;
    deliveryMethod: string;
    deliveryAddress?: string | null;
  };
}

const pad = (n: number) => String(n).padStart(2, '0');
// Ngày lưu dạng DATE (UTC nửa đêm) nên đọc theo UTC để không lệch ngày theo múi giờ máy chủ.
export const fmtDate = (d: Date) => `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
export const fmtVnd = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const money = (n: number) => `${fmtVnd(n)} VNĐ (Bằng chữ: ${moneyInWords(n)})`;
const clean = (v?: string | null) => (v ?? '').trim();

function partyRows(p: PartyInput, nameLabel: string, extra: Array<[string, string]> = []): Array<[string, string]> {
  const rows: Array<[string, string]> = [[nameLabel, p.displayName ? `${p.displayName} (${p.name})` : p.name]];
  if (clean(p.address)) rows.push(['Địa chỉ', clean(p.address)]);
  if (p.idLast4) rows.push(['Giấy tờ định danh', `${ID_TYPE_NAMES[p.idType ?? ''] ?? 'Giấy tờ tùy thân'} đã xác thực trên nền tảng, 4 số cuối: ${p.idLast4}`]);
  if (clean(p.phone)) rows.push(['Điện thoại', clean(p.phone)]);
  rows.push(['Email', p.email]);
  rows.push(...extra);
  return rows;
}

function remainingAmount(b: ContractDocumentParams['booking']) {
  return Math.max(0, b.totalPrice - b.depositAmount - b.discountAmount);
}

function articleSubject(p: ContractDocumentParams): DocArticle {
  const { listing, booking } = p;
  const kv: Array<[string, string]> = [['Tên thiết bị', listing.title]];
  const category = CATEGORY_NAMES[listing.category];
  if (category) kv.push(['Danh mục', category]);
  kv.push(['Số lượng', String(booking.quantity)]);
  if (clean(listing.location)) kv.push(['Khu vực', clean(listing.location)]);
  if (listing.marketValue && listing.marketValue > 0) kv.push(['Giá trị thị trường (do Bên A khai báo)', `${fmtVnd(listing.marketValue)} VNĐ`]);

  const blocks: DocBlock[] = [
    { type: 'p', text: 'Bên A đồng ý cho Bên B thuê và Bên B đồng ý thuê thiết bị sau đây (sau đây gọi là “Thiết bị”):' },
    { type: 'kv', rows: kv },
  ];
  if (clean(listing.conditionNote)) {
    blocks.push({ type: 'p', text: `Tình trạng Thiết bị do Bên A khai báo: ${clean(listing.conditionNote)}` });
  }
  blocks.push(
    { type: 'p', text: 'Tình trạng thực tế của Thiết bị khi bàn giao và khi nhận lại được ghi trong Biên bản bàn giao (Phụ lục 1) và Biên bản nhận lại, thanh lý (Phụ lục 2), là một phần không thể tách rời của Hợp đồng này.' },
    { type: 'p', text: 'Bên A cam kết Thiết bị thuộc quyền sở hữu hoặc quyền sử dụng hợp pháp của Bên A, không có tranh chấp và không là đối tượng của giao dịch nào khác có thể ảnh hưởng đến quyền sử dụng của Bên B theo Hợp đồng này.' },
    { type: 'p', text: 'Mục đích thuê: Bên B thuê Thiết bị để phục vụ nhu cầu cá nhân, gia đình hoặc chuyến đi của mình. Bên B cam kết không sử dụng Thiết bị vào mục đích vi phạm pháp luật và không cho thuê lại, cầm cố, thế chấp Thiết bị.' },
  );
  return { title: 'ĐIỀU 1. ĐỐI TƯỢNG HỢP ĐỒNG', blocks };
}

function articleTerm(p: ContractDocumentParams): DocArticle {
  const { booking, provider, listing } = p;
  const delivery = booking.deliveryMethod === 'DELIVERY'
    ? `Giao tận nơi tại địa chỉ: ${clean(booking.deliveryAddress) || 'theo thông tin Bên B cung cấp trên nền tảng'}`
    : `Nhận và trả tại: ${clean(provider.address) || clean(listing.location) || 'địa điểm Bên A cung cấp trên nền tảng'}`;
  return {
    title: 'ĐIỀU 2. THỜI HẠN THUÊ VÀ GIAO NHẬN THIẾT BỊ',
    blocks: [
      { type: 'sub', text: 'Thời hạn thuê' },
      { type: 'kv', rows: [
        ['Số ngày thuê', `${booking.rentalDays} ngày (tính cả ngày bắt đầu và ngày kết thúc)`],
        ['Ngày bắt đầu', fmtDate(booking.startDate)],
        ['Ngày kết thúc', fmtDate(booking.endDate)],
      ] },
      { type: 'sub', text: 'Giao nhận' },
      { type: 'kv', rows: [['Hình thức', delivery]] },
      { type: 'list', items: [
        'Việc bàn giao và nhận lại Thiết bị do nhân viên FlexTrip được phân công thực hiện, có lập biên bản kèm ảnh tình trạng, theo Điều 6.',
        'Bên B có trách nhiệm trả Thiết bị đúng thời hạn, đúng địa điểm đã thỏa thuận và đầy đủ phụ kiện đi kèm (nếu có).',
        'Việc thay đổi ngày thuê chỉ có hiệu lực khi được thực hiện trên nền tảng FlexTrip và được Bên A đồng ý.',
        'Trường hợp Bên B trả Thiết bị chậm so với thời hạn mà không được Bên A đồng ý, Bên A có quyền yêu cầu bồi thường thiệt hại thực tế phát sinh theo Điều 8.',
      ] },
    ],
  };
}

function articlePrice(p: ContractDocumentParams): DocArticle {
  const { booking } = p;
  const rows: Array<[string, string]> = [
    ['Đơn giá thuê', `${fmtVnd(booking.unitPrice)} VNĐ/ngày/thiết bị`],
    ['Số lượng và số ngày', `${booking.quantity} thiết bị × ${booking.rentalDays} ngày`],
    ['Tổng giá trị Hợp đồng', money(booking.totalPrice)],
    [`Tiền đặt cọc (${booking.depositPercent}% tổng giá trị)`, money(booking.depositAmount)],
  ];
  if (booking.discountAmount > 0) rows.push(['Giảm giá (voucher)', money(booking.discountAmount)]);
  rows.push(['Số tiền thuê còn lại', money(remainingAmount(booking))]);
  return {
    title: 'ĐIỀU 3. GIÁ THUÊ, ĐẶT CỌC VÀ THANH TOÁN',
    blocks: [
      { type: 'kv', rows },
      { type: 'list', items: [
        `Khoản đặt cọc là khoản trả trước ${booking.depositPercent}% tổng giá trị thuê, được tính vào tổng giá trị Hợp đồng và được ghi nhận trong ví ký quỹ trên nền tảng FlexTrip.`,
        'Sau khi Bên A xác nhận đơn thuê, Bên B thanh toán số tiền thuê còn lại trong vòng 24 giờ; quá thời hạn này đơn thuê có thể bị huỷ theo quy định của nền tảng.',
        'Bên B thanh toán trực tuyến bằng ví FlexTrip hoặc cổng thanh toán được hỗ trợ trên nền tảng.',
        'Giá thuê chưa bao gồm các chi phí phát sinh khác do Bên B tự phát sinh trong quá trình sử dụng Thiết bị.',
      ] },
    ],
  };
}

function articlesRights(): DocArticle[] {
  return [
    { title: 'ĐIỀU 4. QUYỀN VÀ NGHĨA VỤ CỦA BÊN A', blocks: [
      { type: 'sub', text: 'Quyền của Bên A' },
      { type: 'list', items: [
        'Nhận đủ tiền thuê theo Điều 3.',
        'Nhận lại Thiết bị đúng thời hạn, địa điểm và tình trạng như khi bàn giao (có tính đến hao mòn tự nhiên hợp lý).',
        'Yêu cầu Bên B bồi thường thiệt hại đối với Thiết bị nếu do lỗi của Bên B gây ra, theo Điều 7 và Điều 8.',
        'Chấm dứt Hợp đồng và thu hồi Thiết bị nếu Bên B sử dụng sai mục đích, vi phạm pháp luật hoặc vi phạm nghiêm trọng Hợp đồng.',
      ] },
      { type: 'sub', text: 'Nghĩa vụ của Bên A' },
      { type: 'list', items: [
        'Bàn giao Thiết bị đúng mô tả, đúng tình trạng đã khai báo và đầy đủ phụ kiện đi kèm.',
        'Bảo đảm Thiết bị hoạt động bình thường và an toàn khi sử dụng.',
        'Hướng dẫn Bên B các thao tác sử dụng cơ bản và lưu ý cần thiết.',
        'Chịu trách nhiệm về nguồn gốc và quyền sở hữu, quyền sử dụng Thiết bị.',
        'Hỗ trợ Bên B khi Thiết bị gặp lỗi kỹ thuật không do Bên B gây ra.',
        'Không tự ý thay đổi giá và điều kiện thuê sau khi Hợp đồng đã được ký.',
      ] },
    ] },
    { title: 'ĐIỀU 5. QUYỀN VÀ NGHĨA VỤ CỦA BÊN B', blocks: [
      { type: 'sub', text: 'Quyền của Bên B' },
      { type: 'list', items: [
        'Nhận Thiết bị đúng thời gian, địa điểm và tình trạng đã thỏa thuận.',
        'Sử dụng Thiết bị trong suốt thời hạn thuê theo đúng mục đích đã cam kết.',
        'Yêu cầu Bên A hỗ trợ khi Thiết bị gặp sự cố không phải do lỗi của mình.',
      ] },
      { type: 'sub', text: 'Nghĩa vụ của Bên B' },
      { type: 'list', items: [
        'Thanh toán đầy đủ tiền thuê và tiền đặt cọc theo Điều 3.',
        'Bảo quản, giữ gìn Thiết bị và phụ kiện trong suốt thời gian thuê; không tự ý tháo dỡ, sửa chữa hoặc thay đổi Thiết bị.',
        'Sử dụng Thiết bị đúng mục đích và hướng dẫn; không cho thuê lại.',
        'Thông báo ngay cho Bên A và nhân viên FlexTrip khi Thiết bị bị hư hỏng, mất mát hoặc có sự cố.',
        'Trả Thiết bị đúng hạn, đúng địa điểm, đầy đủ phụ kiện và cùng nhân viên FlexTrip xác nhận tình trạng khi trả.',
        'Bồi thường hư hỏng, mất mát đối với Thiết bị do lỗi của mình gây ra, kể cả do người được Bên B cho phép sử dụng gây ra.',
      ] },
    ] },
  ];
}

function articlePlatform(): DocArticle {
  return {
    title: 'ĐIỀU 6. VAI TRÒ CỦA NỀN TẢNG FLEXTRIP',
    blocks: [{ type: 'list', items: [
      'FlexTrip là nền tảng trung gian kết nối Bên A và Bên B; FlexTrip không phải là bên cho thuê hay bên thuê trong Hợp đồng này.',
      'Tiền đặt cọc và tiền thuê được thanh toán qua ví ký quỹ trên nền tảng; FlexTrip giữ các khoản này và chỉ chuyển cho các bên khi đơn thuê hoàn thành hoặc theo kết luận xử lý tranh chấp.',
      'Nhân viên FlexTrip được phân công thực hiện bàn giao và nhận lại Thiết bị, lập biên bản kèm ảnh tình trạng làm căn cứ khi có tranh chấp.',
      'Khi hai bên không thống nhất về tình trạng Thiết bị, nhân viên FlexTrip lập biên bản thương lượng; nếu vẫn không thống nhất, vụ việc được chuyển cho quản trị viên FlexTrip xem xét và đưa ra kết luận.',
    ] }],
  };
}

function articleDamage(p: ContractDocumentParams): DocArticle {
  const { listing } = p;
  const blocks: DocBlock[] = [
    { type: 'p', text: 'Bên B chịu trách nhiệm bồi thường khi Thiết bị bị hư hỏng hoặc mất mát do lỗi của Bên B. Căn cứ xác định thiệt hại ưu tiên là biên bản và ảnh tình trạng khi bàn giao và khi nhận lại.' },
  ];
  if (listing.penaltyRules.length > 0) {
    blocks.push(
      { type: 'sub', text: 'Bảng mức bồi thường do Bên A công bố trên sản phẩm' },
      {
        type: 'table',
        head: ['Loại thiệt hại', 'Mô tả', 'Mức bồi thường (VNĐ)'],
        rows: listing.penaltyRules.map((r) => [
          r.item, r.description,
          r.minAmount === r.maxAmount ? fmtVnd(r.minAmount) : `${fmtVnd(r.minAmount)} – ${fmtVnd(r.maxAmount)}`,
        ]),
      },
      { type: 'p', text: 'Thiệt hại vượt quá mức bồi thường tối đa trong bảng trên do hai bên thương lượng hoặc đề nghị FlexTrip hòa giải.' },
    );
  } else {
    blocks.push({ type: 'p', text: 'Bên A không công bố bảng mức bồi thường riêng; thiệt hại được xác định theo thiệt hại thực tế có bằng chứng.' });
  }
  if (listing.marketValue && listing.marketValue > 0) {
    blocks.push({ type: 'p', text: `Trường hợp Thiết bị bị mất hoặc hư hỏng toàn bộ không thể phục hồi, Bên B bồi thường theo giá trị thị trường tại thời điểm xảy ra sự việc. Giá trị thị trường do Bên A khai báo khi đăng sản phẩm là ${fmtVnd(listing.marketValue)} VNĐ.` });
  }
  return { title: 'ĐIỀU 7. HƯ HỎNG, MẤT MÁT VÀ BỒI THƯỜNG', blocks };
}

const articleBreach = (): DocArticle => ({
  title: 'ĐIỀU 8. VI PHẠM HỢP ĐỒNG VÀ BỒI THƯỜNG THIỆT HẠI',
  blocks: [{ type: 'list', items: [
    'Bên nào vi phạm Hợp đồng mà gây thiệt hại cho bên còn lại thì phải bồi thường thiệt hại thực tế phát sinh do hành vi vi phạm gây ra.',
    'Mức bồi thường đối với từng loại hư hỏng áp dụng theo bảng tại Điều 7 (nếu có). Hai bên không thỏa thuận mức phạt vi phạm nào khác ngoài nội dung Hợp đồng này.',
    'Khoản bồi thường được xử lý trên cơ sở bằng chứng và kết luận theo Điều 6.',
  ] }],
});

function articleCancel(): DocArticle {
  const { fullRefundDaysAbove: full, rentalOnlyDaysAbove: rental } = CANCELLATION_POLICY;
  return {
    title: 'ĐIỀU 9. HUỶ ĐƠN, HOÀN TIỀN VÀ CHẤM DỨT HỢP ĐỒNG',
    blocks: [
      { type: 'sub', text: 'Huỷ đơn và hoàn tiền' },
      { type: 'list', items: [
        'Bên A từ chối hoặc huỷ đơn, hoặc hệ thống huỷ đơn: Bên B được hoàn 100% số tiền đã thanh toán.',
        'Bên B huỷ đơn trước khi Bên A xác nhận: hoàn 100% số tiền đã thanh toán.',
        `Bên B huỷ đơn sau khi Bên A xác nhận: huỷ trước ngày bắt đầu hơn ${full} ngày được hoàn 100%; huỷ trước ngày bắt đầu từ ${rental + 1} đến ${full} ngày được hoàn phần tiền thuê đã thanh toán, không hoàn khoản đặt cọc; huỷ trước ngày bắt đầu ${rental} ngày trở xuống hoặc sau ngày bắt đầu thì không được hoàn tiền.`,
      ] },
      { type: 'sub', text: 'Chấm dứt Hợp đồng' },
      { type: 'list', items: [
        'Hợp đồng chấm dứt khi hết thời hạn thuê và các bên đã hoàn thành nghĩa vụ, hoặc khi hai bên thỏa thuận chấm dứt trước thời hạn.',
        'Bên A có quyền đơn phương chấm dứt Hợp đồng nếu Bên B sử dụng Thiết bị sai mục đích, vi phạm pháp luật hoặc vi phạm nghiêm trọng các điều khoản của Hợp đồng; Bên B có quyền đơn phương chấm dứt nếu Bên A giao Thiết bị không đúng mô tả hoặc chậm trễ không có lý do chính đáng.',
        'Việc chấm dứt Hợp đồng không làm mất các quyền và nghĩa vụ đã phát sinh trước đó.',
      ] },
    ],
  };
}

const articleForce = (): DocArticle => ({
  title: 'ĐIỀU 10. SỰ KIỆN BẤT KHẢ KHÁNG',
  blocks: [
    { type: 'p', text: 'Sự kiện bất khả kháng là sự kiện xảy ra một cách khách quan, không thể lường trước và không thể khắc phục được mặc dù đã áp dụng mọi biện pháp cần thiết trong khả năng cho phép, bao gồm thiên tai, hỏa hoạn, chiến tranh, dịch bệnh và quyết định của cơ quan nhà nước có thẩm quyền.' },
    { type: 'p', text: 'Bên bị ảnh hưởng phải thông báo kịp thời cho bên kia kèm bằng chứng, được miễn trách nhiệm đối với việc không thực hiện nghĩa vụ trong thời gian xảy ra sự kiện; các bên cùng thỏa thuận phương án giải quyết phù hợp.' },
  ],
});

const articleDispute = (): DocArticle => ({
  title: 'ĐIỀU 11. GIẢI QUYẾT TRANH CHẤP',
  blocks: [{ type: 'p', text: 'Mọi tranh chấp phát sinh từ hoặc liên quan đến Hợp đồng được giải quyết trước hết bằng thương lượng, hòa giải trên tinh thần hợp tác, bao gồm cơ chế hòa giải của FlexTrip tại Điều 6. Trường hợp không giải quyết được, một trong các bên có quyền đưa vụ việc ra Tòa án nhân dân có thẩm quyền theo quy định của pháp luật.' }],
});

const articleGeneral = (): DocArticle => ({
  title: 'ĐIỀU 12. ĐIỀU KHOẢN CHUNG',
  blocks: [{ type: 'list', items: [
    'Hợp đồng có hiệu lực kể từ khi cả hai bên ký điện tử trên nền tảng FlexTrip.',
    'Hai bên thống nhất ký Hợp đồng bằng chữ ký điện tử dưới dạng chữ ký tay trên màn hình, kèm thời điểm ký và mã xác thực nội dung. Hai bên thừa nhận Hợp đồng điện tử và chữ ký điện tử có giá trị pháp lý theo quy định của pháp luật về giao dịch điện tử.',
    'Mọi sửa đổi, bổ sung Hợp đồng phải được lập thành văn bản hoặc thực hiện trên nền tảng và được cả hai bên đồng ý; phụ lục là một phần không thể tách rời của Hợp đồng.',
    'Hợp đồng điện tử được lưu trên hệ thống FlexTrip; mỗi bên có quyền truy cập và tải về bản của mình.',
  ] }],
});

export function buildContractDocument(p: ContractDocumentParams): ContractDocument {
  const d = p.issuedAt;
  const providerName = p.provider.displayName ?? p.provider.name;
  return {
    version: 2,
    title: CONTRACT_TITLE,
    nation: NATION_HEADER,
    number: p.number,
    issuedAt: d.toISOString(),
    basis: LEGAL_BASIS,
    opening: `Hôm nay, ngày ${pad(d.getUTCDate())} tháng ${pad(d.getUTCMonth() + 1)} năm ${d.getUTCFullYear()}, chúng tôi gồm:`,
    parties: [
      { heading: 'BÊN A (BÊN CHO THUÊ)', rows: partyRows(p.provider, 'Tên cá nhân/cửa hàng', p.provider.bankAccount ? [['Tài khoản ngân hàng', clean(p.provider.bankAccount)]] : []) },
      { heading: 'BÊN B (BÊN THUÊ)', rows: partyRows(p.traveler, 'Họ và tên') },
    ],
    intro: INTRO,
    articles: [
      articleSubject(p), articleTerm(p), articlePrice(p), ...articlesRights(), articlePlatform(),
      articleDamage(p), articleBreach(), articleCancel(), articleForce(), articleDispute(), articleGeneral(),
    ],
    closing: CLOSING,
    signers: [{ label: 'ĐẠI DIỆN BÊN A', name: providerName }, { label: 'ĐẠI DIỆN BÊN B', name: p.traveler.name }],
  };
}

const letter = (i: number) => `${String.fromCharCode(97 + i)})`;

/** Văn bản thuần của cùng nội dung, để các màn hình cũ (Staff, Admin, in ấn) tiếp tục đọc `terms`. */
export function renderDocumentText(doc: ContractDocument): string {
  const out: string[] = [doc.nation[0], doc.nation[1], '', doc.title];
  if (doc.number) out.push(`Số: ${doc.number}`);
  out.push('', ...doc.basis.map((b) => `- ${b}`), '', doc.opening, '');
  for (const party of doc.parties) {
    out.push(`${party.heading}:`, ...party.rows.map(([k, v]) => `${k}: ${v}`), '');
  }
  out.push(doc.intro, '');
  for (const art of doc.articles) {
    out.push(art.title);
    for (const b of art.blocks) {
      if (b.type === 'p') out.push(b.text);
      else if (b.type === 'sub') out.push(`${b.text}:`);
      else if (b.type === 'list') out.push(...b.items.map((t, i) => `${letter(i)} ${t}`));
      else if (b.type === 'kv') out.push(...b.rows.map(([k, v]) => `- ${k}: ${v}`));
      else if (b.type === 'table') out.push(...b.rows.map((r) => `- ${r.join(' | ')}`));
      else out.push(`- Ảnh đính kèm: ${b.urls.length}`);
    }
    out.push('');
  }
  out.push(doc.closing, '', ...doc.signers.map((s) => `${s.label}: ${s.name}`));
  return out.join('\n');
}

/** JSON với khoá sắp xếp: Postgres JSONB đổi thứ tự khoá nên mã băm phải không phụ thuộc thứ tự. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export const hashContent = (doc: unknown) => createHash('sha256').update(canonicalJson(doc)).digest('hex');

const SIGNATURE_PREFIX = 'data:image/png;base64,';
export const SIGNATURE_MIN_BYTES = 1000;
export const SIGNATURE_MAX_BYTES = 100_000;

/** Trả về lý do không hợp lệ, hoặc null nếu ảnh chữ ký hợp lệ. */
export function signatureProblem(image: unknown): string | null {
  if (typeof image !== 'string' || !image.startsWith(SIGNATURE_PREFIX)) return 'Chữ ký phải là ảnh PNG.';
  const b64 = image.slice(SIGNATURE_PREFIX.length);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return 'Chữ ký không hợp lệ.';
  const bytes = Buffer.from(b64, 'base64');
  const isPng = bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (!isPng) return 'Chữ ký phải là ảnh PNG.';
  if (bytes.length < SIGNATURE_MIN_BYTES) return 'Chữ ký quá đơn giản, vui lòng ký lại.';
  if (bytes.length > SIGNATURE_MAX_BYTES) return 'Ảnh chữ ký quá lớn.';
  return null;
}

/** Ảnh chữ ký và thời điểm ký; không trả IP/user-agent về trình duyệt. */
export function publicSignature(sig: unknown) {
  const s = sig as { image?: string; signedAt?: string; hash?: string } | null;
  return s?.image ? { image: s.image, signedAt: s.signedAt ?? null, hash: s.hash ?? null } : null;
}

export interface AppendixInput {
  checkedInAt: Date | null;
  handoverCondition: string | null;
  checkInPhotos: string[];
  checkedOutAt: Date | null;
  returnCondition: string | null;
  checkOutPhotos: unknown;
  staffName: string | null;
  refundedAmount: number;
}

// Giờ Việt Nam (UTC+7) cho thời điểm giao nhận, không phụ thuộc múi giờ máy chủ.
function fmtDateTimeVn(d: Date) {
  const v = new Date(d.getTime() + 7 * 3_600_000);
  return `${pad(v.getUTCHours())}:${pad(v.getUTCMinutes())} ngày ${fmtDate(v)}`;
}

function photoUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === 'string' ? v : (v as { url?: unknown } | null)?.url))
    .filter((u): u is string => typeof u === 'string' && u.length > 0);
}

/** Phụ lục sinh từ biên bản Staff đã lưu; chỉ hiện phụ lục nào đã có dữ liệu thật. */
export function buildAppendices(a: AppendixInput): DocArticle[] {
  const out: DocArticle[] = [];
  if (a.checkedInAt) {
    const rows: Array<[string, string]> = [['Thời điểm bàn giao', fmtDateTimeVn(a.checkedInAt)]];
    if (a.staffName) rows.push(['Nhân viên FlexTrip thực hiện', a.staffName]);
    const blocks: DocBlock[] = [{ type: 'kv', rows }];
    if (clean(a.handoverCondition)) blocks.push({ type: 'sub', text: 'Kết quả kiểm tra và ghi chú' }, { type: 'p', text: clean(a.handoverCondition) });
    if (a.checkInPhotos.length) blocks.push({ type: 'images', urls: a.checkInPhotos });
    out.push({ title: 'PHỤ LỤC 1. BIÊN BẢN BÀN GIAO THIẾT BỊ', blocks });
  }
  if (a.checkedOutAt) {
    const rows: Array<[string, string]> = [['Thời điểm nhận lại', fmtDateTimeVn(a.checkedOutAt)]];
    if (a.staffName) rows.push(['Nhân viên FlexTrip thực hiện', a.staffName]);
    if (a.refundedAmount > 0) rows.push(['Số tiền hoàn lại cho Bên B', money(a.refundedAmount)]);
    const blocks: DocBlock[] = [{ type: 'kv', rows }];
    if (clean(a.returnCondition)) blocks.push({ type: 'sub', text: 'Kết quả kiểm tra và ghi chú' }, { type: 'p', text: clean(a.returnCondition) });
    const photos = photoUrls(a.checkOutPhotos);
    if (photos.length) blocks.push({ type: 'images', urls: photos });
    blocks.push({ type: 'p', text: 'Nhân viên FlexTrip xác nhận đã nhận lại Thiết bị và hoàn tất việc kiểm tra theo biên bản trên.' });
    out.push({ title: 'PHỤ LỤC 2. BIÊN BẢN NHẬN LẠI VÀ THANH LÝ HỢP ĐỒNG', blocks });
  }
  return out;
}
