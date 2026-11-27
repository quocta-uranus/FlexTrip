export type LegalGroup = 'terms' | 'privacy';

export interface LegalBlock {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
  steps?: string[];
}

export interface LegalSection {
  number: number;
  title: string;
  blocks: LegalBlock[];
}

export interface LegalPart {
  id: string;
  numeral: string;
  title: string;
  group: LegalGroup;
  sections: LegalSection[];
}

export const LEGAL_META = {
  title: 'Bộ chính sách sử dụng nền tảng FlexTrip',
  version: '1.0',
  updatedAt: '23/11/2026',
  scope: 'Người truy cập, Traveler, Provider và Staff sử dụng FlexTrip tại Việt Nam.',
  notice:
    'Khi đăng ký tài khoản, đặt thuê, ký hợp đồng điện tử hoặc tiếp tục sử dụng FlexTrip sau khi được thông báo, bạn xác nhận đã đọc và đồng ý với chính sách này. Các quy định bắt buộc của pháp luật luôn được ưu tiên áp dụng.',
} as const;

export const LEGAL_PARTS: LegalPart[] = [
  {
    id: 'phan-1',
    numeral: 'I',
    title: 'Điều khoản sử dụng',
    group: 'terms',
    sections: [
      {
        number: 1,
        title: 'Giải thích thuật ngữ và vai trò của FlexTrip',
        blocks: [
          {
            bullets: [
              'FlexTrip là nền tảng công nghệ trung gian hỗ trợ đăng tin cho thuê, tìm kiếm, đặt thuê, thanh toán, lập hợp đồng điện tử, bàn giao và đánh giá.',
              'Traveler là cá nhân thuê thiết bị. Provider là cá nhân hoặc tổ chức cho thuê thiết bị sau khi được FlexTrip xét duyệt.',
              'Admin là quản trị viên của FlexTrip, chịu trách nhiệm kiểm duyệt và giải quyết khiếu nại. Staff là nhân viên FlexTrip xác nhận bàn giao và nhận lại thiết bị.',
              'Hợp đồng thuê là thỏa thuận điện tử giữa Traveler và Provider cho từng đơn, gồm thiết bị, thời gian, giá thuê, tiền cọc và điều kiện bồi thường.',
            ],
          },
          {
            paragraphs: [
              'FlexTrip không sở hữu thiết bị đăng trên nền tảng và không phải là bên cho thuê. FlexTrip hỗ trợ giao dịch nhưng không thay thế trách nhiệm của hai bên trong hợp đồng thuê.',
            ],
          },
        ],
      },
      {
        number: 2,
        title: 'Điều kiện sử dụng và tài khoản',
        blocks: [
          {
            paragraphs: [
              'Người dùng phải có đầy đủ năng lực hành vi dân sự. Người chưa đủ 18 tuổi chỉ được sử dụng khi pháp luật cho phép và có sự đồng ý của người đại diện.',
            ],
          },
          {
            heading: 'Bạn có nghĩa vụ',
            bullets: [
              'Cung cấp thông tin chính xác và xác thực email bằng mã OTP khi đăng ký.',
              'Bảo mật mật khẩu, mã xác thực 2 bước và thiết bị đăng nhập; báo ngay khi nghi ngờ bị truy cập trái phép.',
              'Chịu trách nhiệm về hoạt động phát sinh từ tài khoản của mình.',
              'Không mua bán, cho thuê, chuyển nhượng tài khoản hoặc giả mạo người khác.',
            ],
          },
          {
            paragraphs: [
              'Để bảo vệ tài khoản, hệ thống có thể tạm khoá đăng nhập khi nhập sai nhiều lần liên tiếp. Provider cần hoàn tất đăng ký và được FlexTrip xét duyệt, có thể phải cung cấp giấy tờ xác minh danh tính.',
            ],
          },
        ],
      },
      {
        number: 3,
        title: 'Quyền và nghĩa vụ của Người thuê (Traveler)',
        blocks: [
          {
            heading: 'Quyền',
            bullets: [
              'Nhận thông tin trung thực về thiết bị, giá thuê và tiền cọc.',
              'Được bàn giao đúng tình trạng đã mô tả.',
              'Khiếu nại khi có sai lệch và đánh giá sau khi hoàn tất đơn.',
            ],
          },
          {
            heading: 'Nghĩa vụ',
            bullets: [
              'Thanh toán đúng hạn.',
              'Sử dụng thiết bị đúng mục đích và hướng dẫn.',
              'Kiểm tra tình trạng thiết bị khi nhận và khi trả cùng nhân viên FlexTrip.',
              'Bồi thường khi làm hư hỏng, mất hoặc trả trễ theo hợp đồng.',
            ],
          },
        ],
      },
      {
        number: 4,
        title: 'Quyền và nghĩa vụ của Người cho thuê (Provider)',
        blocks: [
          {
            heading: 'Quyền',
            bullets: [
              'Tự quản lý tin đăng, giá thuê và lịch cho thuê.',
              'Nhận thanh toán sau khi đơn hoàn tất theo quy trình quyết toán.',
              'Phản hồi đánh giá và báo cáo đánh giá có dấu hiệu giả mạo.',
            ],
          },
          {
            heading: 'Nghĩa vụ',
            bullets: [
              'Mô tả đúng thiết bị, hình ảnh, tình trạng, giá thuê và tiền cọc.',
              'Chỉ đăng thiết bị mà bạn có quyền cho thuê và bảo đảm an toàn khi sử dụng.',
              'Bàn giao và nhận lại thiết bị đúng thời gian đã xác nhận.',
              'Chấp nhận phí dịch vụ của nền tảng được hiển thị trước khi nhận đơn.',
              'Tự chịu trách nhiệm về thuế và nghĩa vụ của người cho thuê theo quy định pháp luật.',
            ],
          },
        ],
      },
      {
        number: 5,
        title: 'Quyền và nghĩa vụ của FlexTrip',
        blocks: [
          {
            heading: 'Quyền của FlexTrip',
            bullets: [
              'Vận hành, bảo trì, nâng cấp và thay đổi tính năng vì lý do an toàn, pháp luật hoặc chất lượng dịch vụ.',
              'Xác minh tài khoản, yêu cầu bổ sung thông tin hoặc giấy tờ khi cần.',
              'Kiểm duyệt nội dung; ẩn, từ chối hoặc gỡ nội dung vi phạm.',
              'Thu phí dịch vụ đã công bố; khấu trừ khoản phải trả khi có căn cứ hợp đồng hoặc kết quả giải quyết tranh chấp.',
              'Tạm giữ tiền cọc, tạm hoãn quyết toán trong thời gian xử lý khiếu nại hoặc khi có dấu hiệu gian lận.',
              'Hạn chế tính năng, tạm khoá hoặc chấm dứt tài khoản vi phạm.',
              'Hợp tác với cơ quan có thẩm quyền khi pháp luật yêu cầu.',
            ],
          },
          {
            heading: 'Nghĩa vụ của FlexTrip',
            steps: [
              'Minh bạch: hiển thị rõ giá thuê, tiền cọc, phí dịch vụ, điều kiện huỷ và hoàn tiền trước khi người dùng xác nhận đơn.',
              'Bảo vệ tiền của người dùng: giữ tiền cọc đúng mục đích, chỉ hoàn, trừ hoặc quyết toán theo hợp đồng và kết quả xử lý tranh chấp; ghi nhận đầy đủ lịch sử Ví FlexTrip để người dùng tra cứu.',
              'Xét duyệt Provider: kiểm tra hồ sơ trước khi cho phép cho thuê, và xử lý khi phát hiện thông tin sai lệch.',
              'Hỗ trợ bàn giao: bố trí Staff và cung cấp biên bản bàn giao điện tử cho các đơn thuê.',
              'Giải quyết khiếu nại: duy trì kênh tiếp nhận, xác nhận đã nhận và thông báo tiến độ trong thời hạn hợp lý; xem xét khách quan dựa trên chứng cứ của cả hai bên và thông báo lý do của quyết định.',
              'Kiểm duyệt công bằng: áp dụng cùng tiêu chuẩn cho mọi người dùng, cho phép sửa đánh giá và khiếu nại khi bị từ chối, và có người xem xét lại các trường hợp AI không chắc chắn.',
              'Bảo vệ dữ liệu cá nhân: thu thập đúng mục đích đã nêu, mã hoá mật khẩu, hỗ trợ xác thực 2 bước, chỉ cho Admin và Staff truy cập trong phạm vi công việc, thông báo cho người dùng khi có sự cố ảnh hưởng đến dữ liệu của họ.',
              'An toàn hệ thống: duy trì nền tảng ổn định, sao lưu dữ liệu, thông báo trước khi bảo trì lớn khi có thể.',
              'Thông báo: báo cho người dùng các sự kiện quan trọng của đơn (xác nhận, bàn giao, hoàn tất, huỷ, khiếu nại) và khi chính sách thay đổi.',
              'Lưu hồ sơ và tuân thủ pháp luật: lưu hồ sơ giao dịch theo thời hạn luật định, thực hiện nghĩa vụ báo cáo và cung cấp thông tin khi cơ quan có thẩm quyền yêu cầu.',
              'Đào tạo và giám sát Staff và Admin: phân quyền theo vai trò, yêu cầu tuân thủ quy trình và nghĩa vụ bảo mật.',
            ],
          },
        ],
      },
      {
        number: 6,
        title: 'Quyền và nghĩa vụ của Nhân viên (Staff)',
        blocks: [
          {
            paragraphs: [
              'Staff là nhân viên FlexTrip hỗ trợ bàn giao và nhận lại thiết bị cho các đơn được phân công.',
            ],
          },
          {
            heading: 'Quyền',
            bullets: [
              'Được phân công đơn rõ ràng và truy cập thông tin cần thiết của đơn đó.',
              'Từ chối xác nhận bàn giao hoặc nhận lại nếu thiết bị không đúng mô tả, người nhận không đúng hoặc có dấu hiệu gian lận, đồng thời báo cho Admin.',
              'Trao đổi với Traveler và Provider của đơn được phân công để hẹn lịch và xác nhận tình trạng.',
            ],
          },
          {
            heading: 'Nghĩa vụ',
            steps: [
              'Đúng phạm vi: chỉ xử lý và xem thông tin của các đơn được phân công.',
              'Hoàn thiện hồ sơ nhân viên trước khi nhận đơn, và dùng đúng tài khoản được cấp.',
              'Kiểm tra thực tế: đối chiếu thiết bị với mô tả và danh sách kiểm tra trước khi xác nhận; không xác nhận khi chưa kiểm tra.',
              'Ghi nhận trung thực: ghi đúng tình trạng thiết bị tại thời điểm giao và nhận lại, kèm ghi chú hoặc hình ảnh khi có hư hỏng, thiếu phụ kiện.',
              'Đúng hẹn: có mặt và xử lý bàn giao, nhận lại đúng lịch đã hẹn; báo sớm cho các bên khi có thay đổi.',
              'Trung lập: không thiên vị Traveler hay Provider và không nhận lợi ích riêng từ bất kỳ bên nào.',
              'Bảo mật: chỉ dùng thông tin liên hệ cho mục đích bàn giao; không lưu ngoài hệ thống hoặc chia sẻ cho bên thứ ba.',
              'Không giao dịch ngoài nền tảng: không nhận tiền mặt, tiền cọc hoặc thanh toán riêng.',
              'Báo cáo kịp thời: báo cho Admin khi phát hiện hư hỏng, mất mát, tranh cãi tại chỗ hoặc dấu hiệu gian lận, và cung cấp biên bản làm chứng cứ.',
              'Trách nhiệm: chịu trách nhiệm theo quy chế của FlexTrip nếu cố ý xác nhận sai hoặc làm lộ thông tin.',
            ],
          },
        ],
      },
      {
        number: 7,
        title: 'Nội dung do người dùng đăng, đánh giá và tính năng AI',
        blocks: [
          {
            bullets: [
              'Chỉ người đã hoàn tất một đơn thuê mới được đánh giá đơn đó, trong thời hạn cho phép, mỗi đơn một đánh giá. Đánh giá cần trung thực, liên quan và không xúc phạm.',
              'FlexTrip kiểm duyệt nội dung bằng quy tắc tự động và công cụ AI, có sự xem xét của quản trị viên. Nội dung chứa từ ngữ công kích, đe doạ, thông tin liên hệ ngoài nền tảng, spam hoặc dấu hiệu gian lận có thể bị ẩn hoặc từ chối.',
              'Bạn có thể chỉnh sửa đánh giá trong thời hạn cho phép, và khiếu nại một lần khi đánh giá bị từ chối.',
              'Kết quả gợi ý, kiểm duyệt, phân tích cảm xúc, gợi ý giá và nội dung do trợ lý AI tạo ra chỉ mang tính tham khảo. Người dùng tự kiểm tra trước khi ra quyết định. Khi quyết định ảnh hưởng đến quyền lợi hợp pháp của bạn, bạn có quyền yêu cầu người xem xét lại.',
            ],
          },
        ],
      },
      {
        number: 8,
        title: 'Hành vi và nội dung bị cấm',
        blocks: [
          {
            bullets: [
              'Lừa đảo, giả mạo, quấy rối, đe dọa hoặc phân biệt đối xử.',
              'Đăng thiết bị không thuộc quyền cho thuê, hoặc mô tả sai về thiết bị.',
              'Giao dịch ngoài nền tảng để né phí dịch vụ hoặc né cơ chế bảo vệ cọc.',
              'Tạo đánh giá giả, thao túng xếp hạng, thông đồng, tạo đơn giả.',
              'Đăng thông tin liên hệ, tài khoản ngân hàng hoặc giấy tờ nhạy cảm ở nơi công khai.',
              'Khai thác lỗ hổng, thu thập dữ liệu tự động trái phép, phát tán mã độc hoặc làm gián đoạn hệ thống.',
            ],
          },
        ],
      },
      {
        number: 9,
        title: 'Tạm ngừng và chấm dứt',
        blocks: [
          {
            paragraphs: [
              'Bạn có thể ngừng sử dụng và yêu cầu đóng tài khoản sau khi hoàn tất các nghĩa vụ còn tồn tại (đơn đang thuê, khoản phải thanh toán, tranh chấp chưa xử lý).',
              'FlexTrip có thể áp dụng biện pháp ngay khi cần ngăn ngừa gian lận hoặc rủi ro, và trong trường hợp phù hợp sẽ nêu lý do và cho phép khiếu nại. Việc chấm dứt không làm mất các nghĩa vụ đã phát sinh.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'phan-2',
    numeral: 'II',
    title: 'Đặt thuê, tiền cọc và bàn giao',
    group: 'terms',
    sections: [
      {
        number: 10,
        title: 'Đặt thuê và hợp đồng điện tử',
        blocks: [
          {
            bullets: [
              'Thông tin tin đăng chưa phải là hợp đồng. Hợp đồng chỉ hình thành khi bạn xác nhận đơn theo luồng đặt thuê của nền tảng.',
              'Trước khi xác nhận, hãy kiểm tra thiết bị, thời gian thuê, số lượng, giá thuê, tiền cọc, phí và điều kiện huỷ.',
              'Hợp đồng điện tử, chữ ký điện tử (ký tay trên màn hình) và nhật ký hệ thống có giá trị theo Luật Giao dịch điện tử và thỏa thuận của các bên. Bạn có thể xem lại và tải bản hợp đồng của đơn.',
            ],
          },
        ],
      },
      {
        number: 11,
        title: 'Thanh toán, phí và thuế',
        blocks: [
          {
            bullets: [
              'Thanh toán bằng Ví FlexTrip. Nạp ví thực hiện qua cổng thanh toán PayOS; điều khoản của đối tác thanh toán có thể áp dụng bổ sung.',
              'Giá thuê, tiền cọc, phí dịch vụ và tổng tiền được hiển thị trước khi bạn xác nhận.',
              'Tiền chỉ được giải ngân theo quy trình quyết toán sau khi đơn hoàn tất, theo kết quả giải quyết tranh chấp hoặc yêu cầu của cơ quan có thẩm quyền.',
              'Mỗi bên tự chịu trách nhiệm kê khai và nộp thuế thuộc trách nhiệm của mình.',
              'Không được thực hiện giao dịch giả, hoàn tiền gian lận hoặc dùng phương tiện thanh toán không được phép.',
            ],
          },
        ],
      },
      {
        number: 12,
        title: 'Tiền cọc, hoàn cọc và bồi thường',
        blocks: [
          {
            bullets: [
              'Tiền cọc được giữ trong suốt thời gian thuê.',
              'Sau khi thiết bị được trả và Staff kiểm tra, tiền cọc được hoàn cho Traveler, sau khi trừ các khoản bồi thường hợp lý (nếu có) do hư hỏng, mất mát hoặc trả trễ theo hợp đồng.',
              'Mức bồi thường dựa trên hợp đồng, biên bản bàn giao, hình ảnh và bằng chứng của hai bên.',
            ],
          },
        ],
      },
      {
        number: 13,
        title: 'Bàn giao và nhận lại thiết bị',
        blocks: [
          {
            bullets: [
              'Staff của FlexTrip hỗ trợ xác nhận bàn giao và nhận lại, ghi tình trạng vào biên bản bàn giao.',
              'Hai bên cần kiểm tra thiết bị tại thời điểm bàn giao và có quyền ghi chú, chụp ảnh các điểm chưa đạt.',
              'Chỉ sau khi cả hai lần xác nhận (giao và nhận lại) hoàn tất, đơn mới chuyển sang trạng thái hoàn thành.',
            ],
          },
        ],
      },
      {
        number: 14,
        title: 'Huỷ đơn và thay đổi đơn',
        blocks: [
          {
            paragraphs: [
              'Điều kiện huỷ, thay đổi đơn và mức hoàn tiền phụ thuộc trạng thái đơn tại thời điểm thực hiện, được hiển thị trước khi bạn xác nhận. Khoản hoàn được trả về Ví FlexTrip theo quy trình của nền tảng.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'phan-3',
    numeral: 'III',
    title: 'Khiếu nại và giải quyết tranh chấp',
    group: 'terms',
    sections: [
      {
        number: 15,
        title: 'Gửi khiếu nại và bảo toàn chứng cứ',
        blocks: [
          {
            bullets: [
              'Gửi khiếu nại qua mục Hỗ trợ hoặc chức năng khiếu nại của đơn, kèm mã đơn, mô tả vấn đề và tài liệu chứng minh.',
              'Hai bên nên giữ lại tin nhắn, hình ảnh, biên bản bàn giao, hợp đồng và chứng từ thanh toán.',
              'FlexTrip xác nhận đã nhận khiếu nại và thông báo tiến độ trong thời hạn hợp lý. FlexTrip có thể yêu cầu bổ sung thông tin và áp dụng biện pháp tạm thời để bảo vệ tiền cọc, dữ liệu hoặc tài khoản khi có căn cứ.',
            ],
          },
        ],
      },
      {
        number: 16,
        title: 'Trình tự giải quyết',
        blocks: [
          {
            steps: [
              'Trao đổi trực tiếp: Traveler và Provider ưu tiên trao đổi thiện chí trên nền tảng.',
              'Xem xét của FlexTrip: Admin xem xét hợp đồng, chứng cứ của hai bên và biên bản bàn giao, nhận lại do Staff cung cấp.',
              'Quyết định xử lý: Admin quyết định hoàn cọc, trừ một phần hoặc toàn bộ cọc để bồi thường, hoặc áp dụng biện pháp khác theo hợp đồng.',
              'Phản hồi: bên không đồng ý có thể cung cấp thêm chứng cứ để được xem xét lại một lần.',
              'Các biện pháp pháp lý khác: nếu vẫn không đồng ý, các bên có quyền nhờ cơ quan có thẩm quyền giải quyết theo pháp luật.',
            ],
          },
        ],
      },
      {
        number: 17,
        title: 'Tranh chấp về đánh giá',
        blocks: [
          {
            paragraphs: [
              'Nếu đánh giá của bạn bị ẩn hoặc từ chối, bạn có thể khiếu nại một lần trong thời hạn cho phép. Provider có thể báo cáo đánh giá có dấu hiệu giả mạo. Admin xem xét và có thể giữ nguyên, từ chối hoặc khôi phục đánh giá.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'phan-4',
    numeral: 'IV',
    title: 'Quyền riêng tư và dữ liệu cá nhân',
    group: 'privacy',
    sections: [
      {
        number: 18,
        title: 'Thông tin chúng tôi thu thập',
        blocks: [
          {
            bullets: [
              'Tài khoản: họ tên, email, số điện thoại (nếu bạn cung cấp), mật khẩu đã được mã hoá.',
              'Giao dịch: đơn thuê, thanh toán, số dư và lịch sử Ví FlexTrip, hợp đồng, biên bản bàn giao.',
              'Provider: hồ sơ đăng ký cho thuê, khu vực, giấy tờ xác minh.',
              'Nội dung bạn tạo: tin đăng, đánh giá, tin nhắn, yêu cầu hỗ trợ, hình ảnh tải lên.',
              'Kỹ thuật: thông tin thiết bị và phiên đăng nhập để bảo mật tài khoản.',
            ],
          },
        ],
      },
      {
        number: 19,
        title: 'Mục đích sử dụng và chia sẻ',
        blocks: [
          {
            heading: 'Mục đích',
            bullets: [
              'Tạo và bảo mật tài khoản.',
              'Xử lý đơn thuê, thanh toán, hoàn cọc, hợp đồng.',
              'Cho phép hai bên liên hệ khi cần bàn giao.',
              'Kiểm duyệt nội dung, phòng chống gian lận, xử lý khiếu nại.',
              'Hỗ trợ và cải thiện dịch vụ.',
            ],
          },
          {
            heading: 'Chia sẻ',
            paragraphs: ['FlexTrip không bán dữ liệu cá nhân. Thông tin chỉ được chia sẻ với:'],
            bullets: [
              'Bên còn lại của đơn thuê và Staff phụ trách đơn (thông tin cần thiết để bàn giao).',
              'Admin và Staff trong phạm vi cần thiết cho công việc; các bên này chịu nghĩa vụ bảo mật theo quy chế của FlexTrip.',
              'PayOS khi bạn nạp ví.',
              'Nhà cung cấp dịch vụ AI để kiểm duyệt và hỗ trợ trợ lý ảo; chỉ gửi phần nội dung cần xử lý.',
              'Cơ quan có thẩm quyền khi pháp luật yêu cầu.',
            ],
          },
        ],
      },
      {
        number: 20,
        title: 'Bảo mật và lưu trữ',
        blocks: [
          {
            bullets: [
              'Mật khẩu được mã hoá một chiều, FlexTrip không thể xem mật khẩu của bạn.',
              'Hỗ trợ xác thực 2 bước và tự khoá đăng nhập tạm thời khi nhập sai nhiều lần.',
              'Dữ liệu được lưu trong thời gian cần thiết để cung cấp dịch vụ và đáp ứng nghĩa vụ pháp lý, kế toán.',
              'Không hệ thống nào an toàn tuyệt đối. Bạn nên dùng mật khẩu riêng, đủ mạnh và không chia sẻ mã xác thực.',
            ],
          },
        ],
      },
      {
        number: 21,
        title: 'Quyền của bạn đối với dữ liệu',
        blocks: [
          {
            bullets: [
              'Xem và chỉnh sửa thông tin cá nhân trong trang hồ sơ.',
              'Quản lý các phiên đăng nhập và thiết bị của bạn.',
              'Yêu cầu hỗ trợ khi muốn xoá hoặc hạn chế xử lý dữ liệu, trừ phần dữ liệu FlexTrip phải giữ theo quy định.',
              'Rút lại sự đồng ý đối với thông báo không bắt buộc.',
            ],
          },
        ],
      },
      {
        number: 22,
        title: 'Cookie và lưu trữ trên trình duyệt',
        blocks: [
          {
            paragraphs: [
              'FlexTrip dùng cookie và bộ nhớ trình duyệt để giữ phiên đăng nhập (tối đa 7 ngày) và ghi nhớ một số lựa chọn giao diện. Nếu bạn xoá dữ liệu trình duyệt, bạn cần đăng nhập lại.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'phan-5',
    numeral: 'V',
    title: 'Điều khoản chung',
    group: 'terms',
    sections: [
      {
        number: 23,
        title: 'Giới hạn trách nhiệm',
        blocks: [
          {
            paragraphs: [
              'FlexTrip nỗ lực duy trì nền tảng ổn định và an toàn nhưng không bảo đảm không bao giờ gián đoạn, cũng không bảo đảm mọi thông tin do người dùng đăng đều chính xác. Traveler và Provider chịu trách nhiệm về lựa chọn đối tác và việc thực hiện hợp đồng thuê. Không nội dung nào loại trừ trách nhiệm mà pháp luật không cho phép loại trừ.',
            ],
          },
        ],
      },
      {
        number: 24,
        title: 'Thay đổi chính sách',
        blocks: [
          {
            paragraphs: [
              'FlexTrip có thể cập nhật chính sách này. Khi có thay đổi quan trọng, chúng tôi sẽ thông báo trên nền tảng và cập nhật phiên bản, ngày cập nhật. Việc tiếp tục sử dụng sau khi được thông báo nghĩa là bạn chấp nhận bản mới.',
            ],
          },
        ],
      },
      {
        number: 25,
        title: 'Luật áp dụng và liên hệ',
        blocks: [
          {
            paragraphs: [
              'Chính sách này được điều chỉnh bởi pháp luật Việt Nam. Mọi câu hỏi hoặc khiếu nại, vui lòng gửi qua mục Hỗ trợ trong ứng dụng.',
            ],
          },
        ],
      },
    ],
  },
];
