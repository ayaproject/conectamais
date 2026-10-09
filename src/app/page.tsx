import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Encontre profissionais de confiança para o serviço que você precisa.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          O Conecta+ reúne prestadores de serviço analisados pela nossa equipe antes de aparecerem na plataforma.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/cadastro" className="rounded-md bg-emerald-700 px-5 py-2.5 font-medium text-white hover:bg-emerald-800">
            Quero oferecer meus serviços
          </Link>
        </div>
      </section>
      <section className="rounded-xl border border-dashed border-slate-300 p-6 text-slate-600">
        <h2 className="font-semibold text-slate-800">A busca de serviços ainda não está disponível</h2>
        <p className="mt-1 text-sm">
          Estamos recebendo e analisando os primeiros cadastros de prestadores. A busca será aberta quando houver
          profissionais aprovados.
        </p>
      </section>
    </div>
  );
}
