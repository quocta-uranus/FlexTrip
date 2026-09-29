export function PromiseStrip() {
  const promises = [
    { title: "Gần nơi bạn đến", desc: "Tìm thiết bị tại điểm khởi hành" },
    { title: "Linh hoạt theo ngày", desc: "Chỉ thuê trong thời gian bạn cần" },
    { title: "Thông tin rõ ràng", desc: "Ảnh thật, giá thuê và đánh giá" },
    { title: "Kết nối cộng đồng", desc: "Traveler gặp Provider địa phương" },
  ];

  return (
    <section
      className="bg-[#097dae] dark:bg-[#0e1626] text-white py-8 px-6 sm:px-12 border-t border-sky-400/20 dark:border-white/10 transition-colors duration-300"
      aria-label="Lợi ích FlexTrip"
    >
      <div className="mx-auto max-w-7xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {promises.map((item, idx) => (
          <div
            key={item.title}
            className={`flex flex-col gap-1 px-4 sm:px-6 ${
              idx < promises.length - 1
                ? "border-b sm:border-b-0 sm:border-r border-white/15 dark:border-white/10 pb-4 sm:pb-0"
                : ""
            }`}
          >
            <strong className="text-base sm:text-lg font-bold text-white tracking-tight">
              {item.title}
            </strong>
            <span className="text-xs text-white/75 dark:text-slate-400">
              {item.desc}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
