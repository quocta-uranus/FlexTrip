import type { ContractDocument as Doc, DocArticle, DocBlock, PublicSignature } from '@/types/contract';

function viTime(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const letter = (i: number) => `${String.fromCharCode(97 + i)})`;

function Block({ block }: { block: DocBlock }) {
  switch (block.type) {
    case 'p':
      return <p className="whitespace-pre-line text-justify">{block.text}</p>;
    case 'sub':
      return <p className="font-semibold">{block.text}</p>;
    case 'list':
      return (
        <ul className="space-y-1">
          {block.items.map((t, i) => (
            <li key={i} className="flex gap-2 text-justify"><span className="shrink-0">{letter(i)}</span><span>{t}</span></li>
          ))}
        </ul>
      );
    case 'kv':
      return (
        <dl className="space-y-1">
          {block.rows.map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
              <dt className="shrink-0 sm:w-56">{k}:</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      );
    case 'table':
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>{block.head.map((h) => <th key={h} className="border border-slate-400 bg-slate-50 px-2 py-1 text-left">{h}</th>)}</tr>
            </thead>
            <tbody>
              {block.rows.map((r, i) => (
                <tr key={i}>{r.map((c, j) => <td key={j} className="border border-slate-400 px-2 py-1 align-top">{c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'images':
      return (
        <div className="flex flex-wrap gap-2">
          {block.urls.map((u) => (
            // eslint-disable-next-line @next/next/no-img-element -- ảnh biên bản từ kho lưu trữ ngoài
            <img key={u} src={u} alt="Ảnh trong biên bản" className="h-24 w-24 rounded border border-slate-300 object-cover" />
          ))}
        </div>
      );
  }
}

function Article({ article }: { article: DocArticle }) {
  return (
    <section className="space-y-2">
      <h3 className="font-bold">{article.title}</h3>
      {article.blocks.map((b, i) => <Block key={i} block={b} />)}
    </section>
  );
}

function SignBox({ label, name, signature }: { label: string; name: string; signature?: PublicSignature | null }) {
  return (
    <div className="flex-1 text-center">
      <p className="font-bold">{label}</p>
      <p className="text-xs italic text-slate-500">(Ký, ghi rõ họ tên)</p>
      <div className="mx-auto mt-2 flex h-24 max-w-[220px] items-center justify-center">
        {signature ? (
          // eslint-disable-next-line @next/next/no-img-element -- chữ ký là data URL
          <img src={signature.image} alt={`Chữ ký ${name}`} className="max-h-24 max-w-full" />
        ) : (
          <span className="text-xs text-slate-400">Chưa ký</span>
        )}
      </div>
      <p className="font-semibold">{name}</p>
      {signature?.signedAt && <p className="text-xs text-slate-500">Đã ký lúc {viTime(signature.signedAt)}</p>}
      {signature?.hash && <p className="text-[10px] text-slate-400">Mã xác thực: {signature.hash.slice(0, 12)}…</p>}
    </div>
  );
}

interface ContractDocumentProps {
  doc: Doc;
  appendices?: DocArticle[];
  travelerSignature?: PublicSignature | null;
  providerSignature?: PublicSignature | null;
}

export function ContractDocument({ doc, appendices = [], travelerSignature, providerSignature }: ContractDocumentProps) {
  return (
    <article className="mx-auto max-w-3xl space-y-4 bg-white px-5 py-6 font-serif text-[14px] leading-relaxed text-slate-900">
      <header className="text-center">
        <p className="font-bold">{doc.nation[0]}</p>
        <p className="font-bold underline underline-offset-4">{doc.nation[1]}</p>
        <h2 className="mt-4 text-lg font-bold">{doc.title}</h2>
        {doc.number && <p>Số: {doc.number}</p>}
      </header>

      <div className="space-y-1">{doc.basis.map((b) => <p key={b} className="italic">- {b}</p>)}</div>
      <p>{doc.opening}</p>

      {doc.parties.map((p) => (
        <section key={p.heading} className="space-y-1">
          <h3 className="font-bold">{p.heading}</h3>
          <Block block={{ type: 'kv', rows: p.rows }} />
        </section>
      ))}

      <p>{doc.intro}</p>
      {doc.articles.map((a) => <Article key={a.title} article={a} />)}
      <p>{doc.closing}</p>

      <div className="flex flex-col gap-6 pt-2 sm:flex-row">
        <SignBox label={doc.signers[0].label} name={doc.signers[0].name} signature={providerSignature} />
        <SignBox label={doc.signers[1].label} name={doc.signers[1].name} signature={travelerSignature} />
      </div>

      {appendices.map((a) => (
        <div key={a.title} className="mt-6 space-y-2 border-t border-slate-300 pt-4">
          <h3 className="font-bold">{a.title}</h3>
          {a.blocks.map((b, i) => <Block key={i} block={b} />)}
        </div>
      ))}
    </article>
  );
}
