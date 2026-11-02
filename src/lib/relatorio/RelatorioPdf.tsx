import "server-only";
import { ClipPath, Defs, Document, Font, G, Page, Path, Polygon, Rect, renderToBuffer, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import { dataCurta, moeda } from "../formatar";
import {
  descontos,
  destaques,
  diasEntre,
  porDiaDaSemana,
  rotuloCategoria,
  rotuloPagamento,
  serieDoPeriodo,
  taxaFaltas,
  ticketMedio,
  variacao,
  type PontoGrafico,
} from "./calculos";
import type { DadosRelatorio } from "./carregar";

/**
 * Relatório de caixa em PDF (A4), gerado na hora e baixado. Cores e logo do
 * Seu Barbeiro; fonte Helvetica (embutida no leitor de PDF, tem acentos).
 * Gráficos feitos com caixas (barras), sem imagem.
 */

// sem hifenizar palavras no meio ("an-terior")
Font.registerHyphenationCallback((palavra) => [palavra]);

const COR = {
  escuro: "#15110f",
  creme: "#f3ede2",
  papel: "#fffcf6",
  areia: "#f1e9db",
  linha: "#d9cfbf",
  suave: "#655b51",
  vermelho: "#b3122a",
  poste: "#d7263d",
  ouro: "#c9a227",
  verde: "#17602f",
  vermelhoTexto: "#9b1c1c",
};
const PALETA = [COR.vermelho, COR.ouro, "#2f5d8a", COR.verde, "#7a4a06", COR.suave];

const s = StyleSheet.create({
  pagina: { paddingTop: 34, paddingBottom: 56, paddingHorizontal: 0, fontFamily: "Helvetica", fontSize: 9, color: COR.escuro, backgroundColor: COR.papel },
  miolo: { paddingHorizontal: 36 },
  topo: { backgroundColor: COR.escuro, color: COR.creme, paddingHorizontal: 36, paddingTop: 26, paddingBottom: 20, marginTop: -34 },
  marca: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  marcaNome: { fontFamily: "Helvetica-Bold", fontSize: 15, letterSpacing: 2.5, textTransform: "uppercase" },
  etiqueta: { fontFamily: "Helvetica-Bold", fontSize: 8, letterSpacing: 2.5, color: COR.ouro, textTransform: "uppercase" },
  barbearia: { fontFamily: "Helvetica-Bold", fontSize: 24, marginTop: 18, textTransform: "uppercase", letterSpacing: 0.5 },
  subtitulo: { fontSize: 10, marginTop: 4, color: "#cfc6b8" },
  cartoes: { flexDirection: "row", gap: 8, marginTop: 18 },
  cartao: { flex: 1, backgroundColor: "#ffffff", borderWidth: 1, borderColor: COR.linha, borderRadius: 8, padding: 10 },
  cartaoRotulo: { fontSize: 7.5, color: COR.suave, textTransform: "uppercase", letterSpacing: 1 },
  cartaoValor: { fontFamily: "Helvetica-Bold", fontSize: 16, marginTop: 4 },
  cartaoNota: { fontSize: 7, marginTop: 3, color: COR.suave },
  secao: { marginTop: 18 },
  secaoTitulo: { fontFamily: "Helvetica-Bold", fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8, flexDirection: "row", alignItems: "center" },
  destaques: { backgroundColor: COR.areia, borderLeftWidth: 4, borderLeftColor: COR.vermelho, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 12 },
  destaqueLinha: { marginBottom: 4 },
  colunas: { flexDirection: "row", gap: 16 },
  coluna: { flex: 1 },
  tabela: { borderWidth: 1, borderColor: COR.linha, borderRadius: 6, overflow: "hidden" },
  tabelaCab: { flexDirection: "row", backgroundColor: COR.escuro, color: COR.creme, paddingVertical: 5, paddingHorizontal: 8 },
  tabelaLinha: { flexDirection: "row", paddingVertical: 4.5, paddingHorizontal: 8, borderTopWidth: 0.5, borderTopColor: COR.linha },
  th: { fontFamily: "Helvetica-Bold", fontSize: 7.5, textTransform: "uppercase", letterSpacing: 0.6 },
  rodape: { position: "absolute", bottom: 22, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: COR.suave, borderTopWidth: 0.5, borderTopColor: COR.linha, paddingTop: 6 },
});

function Logo({ tamanho = 34 }: { tamanho?: number }) {
  const listras = Array.from({ length: 8 }, (_, i) => 4 + i * 9);
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 64 64">
      <Defs>
        <ClipPath id="poste">
          <Rect x="24" y="14" width="16" height="28" rx="8" />
        </ClipPath>
      </Defs>
      <Path
        d="M18 4h28a14 14 0 0 1 14 14v20a14 14 0 0 1-14 14H25l-12 9 2-10.2A14 14 0 0 1 4 38V18A14 14 0 0 1 18 4Z"
        fill={COR.escuro}
        stroke={COR.creme}
        strokeWidth={2.5}
      />
      <Rect x="24" y="14" width="16" height="28" rx="8" fill="#f8f4ec" />
      <G clipPath="url(#poste)">
        {listras.map((y) => (
          <Polygon key={y} points={`20,${y + 8} 44,${y - 6} 44,${y - 2} 20,${y + 12}`} fill={COR.poste} />
        ))}
      </G>
      <Rect x="22" y="10" width="20" height="5" rx="2.5" fill={COR.ouro} />
      <Rect x="22" y="41" width="20" height="5" rx="2.5" fill={COR.ouro} />
    </Svg>
  );
}

/** Faixa de poste de barbeiro (listras) no pé do cabeçalho. */
function Listras() {
  const n = 60;
  return (
    <Svg width={595} height={7} viewBox="0 0 595 7">
      <Rect x="0" y="0" width="595" height="7" fill={COR.creme} />
      {Array.from({ length: n }, (_, i) => (
        <Polygon key={i} points={`${i * 12},7 ${i * 12 + 6},0 ${i * 12 + 12},0 ${i * 12 + 6},7`} fill={COR.poste} />
      ))}
    </Svg>
  );
}

function Secao({ titulo, children, quebrar = false }: { titulo: string; children: React.ReactNode; quebrar?: boolean }) {
  return (
    <View style={s.secao} wrap={quebrar}>
      <View style={s.secaoTitulo}>
        <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: COR.vermelho, marginRight: 6 }} />
        <Text>{titulo}</Text>
      </View>
      {children}
    </View>
  );
}

function Cartao({ rotulo, valor, nota, corNota }: { rotulo: string; valor: string; nota?: string; corNota?: string }) {
  return (
    <View style={s.cartao}>
      <Text style={s.cartaoRotulo}>{rotulo}</Text>
      <Text style={s.cartaoValor}>{valor}</Text>
      {nota ? <Text style={[s.cartaoNota, corNota ? { color: corNota } : {}]}>{nota}</Text> : null}
    </View>
  );
}

const corVariacao = (v: number | null) => (v === null ? COR.suave : v >= 0 ? COR.verde : COR.vermelhoTexto);

/** Barras verticais: faturamento por dia (ou por mês). */
function GraficoColunas({ pontos }: { pontos: PontoGrafico[] }) {
  const altura = 120;
  const max = Math.max(...pontos.map((p) => p.valor), 1);
  const melhor = pontos.reduce((m, p, i) => (p.valor > pontos[m].valor ? i : m), 0);
  const poucos = pontos.length <= 12;
  return (
    <View>
      <View style={{ flexDirection: "row" }}>
        {/* escala */}
        <View style={{ width: 48, height: altura, justifyContent: "space-between", alignItems: "flex-end", paddingRight: 4 }}>
          <Text style={{ fontSize: 6.5, color: COR.suave }}>{moeda(max)}</Text>
          <Text style={{ fontSize: 6.5, color: COR.suave }}>{moeda(max / 2)}</Text>
          <Text style={{ fontSize: 6.5, color: COR.suave }}>R$ 0</Text>
        </View>
        <View style={{ flex: 1, height: altura, borderLeftWidth: 0.5, borderBottomWidth: 0.5, borderColor: COR.linha, flexDirection: "row", alignItems: "flex-end", gap: pontos.length > 20 ? 2 : 4, paddingHorizontal: 3 }}>
          <View style={{ position: "absolute", left: 0, right: 0, top: 0, borderTopWidth: 0.5, borderTopColor: COR.linha, borderStyle: "dashed" }} />
          <View style={{ position: "absolute", left: 0, right: 0, top: altura / 2, borderTopWidth: 0.5, borderTopColor: COR.linha, borderStyle: "dashed" }} />
          {pontos.map((p, i) => (
            <View key={i} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: altura }}>
              {poucos && p.valor > 0 ? <Text style={{ fontSize: 6, color: COR.suave, marginBottom: 2 }}>{moeda(p.valor).replace(",00", "")}</Text> : null}
              <View
                style={{
                  width: "100%",
                  height: Math.max(p.valor > 0 ? 2 : 0, (p.valor / max) * (altura - (poucos ? 14 : 4))),
                  backgroundColor: i === melhor && p.valor > 0 ? COR.ouro : COR.vermelho,
                  borderTopLeftRadius: 2,
                  borderTopRightRadius: 2,
                }}
              />
            </View>
          ))}
        </View>
      </View>
      <View style={{ flexDirection: "row", marginLeft: 48, gap: pontos.length > 20 ? 2 : 4, paddingHorizontal: 3, marginTop: 3 }}>
        {pontos.map((p, i) => (
          <Text key={i} style={{ flex: 1, fontSize: pontos.length > 20 ? 5.5 : 6.5, textAlign: "center", color: COR.suave }}>
            {p.rotulo}
          </Text>
        ))}
      </View>
      <Text style={{ fontSize: 7, color: COR.suave, marginTop: 6, marginLeft: 48 }}>
        Em dourado, o {pontos.length > 31 || pontos[0]?.rotulo.length > 2 ? "melhor mês" : "melhor dia"}: {pontos[melhor]?.detalhe} ({moeda(pontos[melhor]?.valor ?? 0)}).
      </Text>
    </View>
  );
}

/** Barras horizontais com % do total. */
function GraficoBarras({ itens, umaCor = false }: { itens: { rotulo: string; valor: number; nota: string }[]; umaCor?: boolean }) {
  const total = itens.reduce((t, x) => t + x.valor, 0);
  const max = Math.max(...itens.map((x) => x.valor), 1);
  if (!itens.length) return <Text style={{ color: COR.suave }}>Nada no período.</Text>;
  return (
    <View style={{ gap: 7 }}>
      {itens.map((x, i) => (
        <View key={x.rotulo}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{x.rotulo}</Text>
            <Text>
              {moeda(x.valor)} <Text style={{ color: COR.suave }}>· {total ? Math.round((x.valor / total) * 100) : 0}%</Text>
            </Text>
          </View>
          <View style={{ height: 7, backgroundColor: COR.areia, borderRadius: 4 }}>
            <View style={{ height: 7, width: `${(x.valor / max) * 100}%`, backgroundColor: umaCor ? (x.valor === max ? COR.ouro : COR.vermelho) : PALETA[i % PALETA.length], borderRadius: 4 }} />
          </View>
          <Text style={{ fontSize: 7, color: COR.suave, marginTop: 1.5 }}>{x.nota}</Text>
        </View>
      ))}
    </View>
  );
}

function Tabela({ colunas, linhas, larguras, total }: { colunas: string[]; linhas: string[][]; larguras: number[]; total?: string[] }) {
  const alinhar = (j: number) => (j === 0 ? "left" : "right") as "left" | "right";
  return (
    <View style={s.tabela}>
      <View style={s.tabelaCab} fixed>
        {colunas.map((c, j) => (
          <Text key={c} style={[s.th, { flex: larguras[j], textAlign: alinhar(j) }]}>{c}</Text>
        ))}
      </View>
      {linhas.map((l, i) => (
        <View key={i} style={[s.tabelaLinha, i % 2 ? { backgroundColor: COR.papel } : { backgroundColor: "#ffffff" }]} wrap={false}>
          {l.map((v, j) => (
            <Text key={j} style={{ flex: larguras[j], textAlign: alinhar(j) }}>{v}</Text>
          ))}
        </View>
      ))}
      {total ? (
        <View style={[s.tabelaLinha, { backgroundColor: COR.areia, borderTopWidth: 1, borderTopColor: COR.escuro }]} wrap={false}>
          {total.map((v, j) => (
            <Text key={j} style={{ flex: larguras[j], textAlign: alinhar(j), fontFamily: "Helvetica-Bold" }}>{v}</Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function RelatorioPdf({ d, geradoEm }: { d: DadosRelatorio; geradoEm: string }) {
  const r = d.r!;
  const a = d.anterior;
  const total = Number(r.total);
  const periodoTxt = d.de === d.ate ? dataCurta(d.de) : `${dataCurta(d.de)} a ${dataCurta(d.ate)}`;
  const vTotal = a ? variacao(total, Number(a.total)) : null;
  const vAtend = a ? variacao(r.atendimentos, a.atendimentos) : null;
  const vTicket = a ? variacao(ticketMedio(r), ticketMedio(a)) : null;
  const serie = d.de !== d.ate ? serieDoPeriodo(r.por_dia, d.de, d.ate) : [];
  const semana = diasEntre(d.de, d.ate) >= 14 ? porDiaDaSemana(r.por_dia) : [];
  const lista = destaques(r, a, d.de, d.ate, moeda);
  const variosProf = !d.prof && r.por_profissional.length > 1;

  return (
    <Document title={`Relatório · ${d.barbearia.nome} · ${periodoTxt}`} author="Seu Barbeiro" creator="Seu Barbeiro" language="pt-BR">
      <Page size="A4" style={s.pagina}>
        {/* Cabeçalho escuro com a marca */}
        <View style={s.topo}>
          <View style={s.marca}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
              <Logo />
              <Text style={s.marcaNome}>
                <Text style={{ color: "#a99f92" }}>Seu </Text>Barbeiro
              </Text>
            </View>
            <Text style={s.etiqueta}>Relatório de caixa</Text>
          </View>
          <Text style={s.barbearia}>{d.barbearia.nome}</Text>
          <Text style={s.subtitulo}>
            {periodoTxt} · {d.nomeProf ?? "Todos os profissionais"}
          </Text>
        </View>
        <Listras />

        <View style={s.miolo}>
          <View style={s.cartoes}>
            <Cartao rotulo="Total recebido" valor={moeda(total)} nota={curta(vTotal)} corNota={corVariacao(vTotal)} />
            <Cartao rotulo="Atendimentos" valor={String(r.atendimentos)} nota={curta(vAtend)} corNota={corVariacao(vAtend)} />
            <Cartao rotulo="Ticket médio" valor={moeda(ticketMedio(r))} nota={curta(vTicket)} corNota={corVariacao(vTicket)} />
            <Cartao
              rotulo="Faltas"
              valor={String(r.faltas)}
              nota={`${Math.round(taxaFaltas(r))}% dos horários · ${r.cancelados} cancelado${r.cancelados === 1 ? "" : "s"}`}
              corNota={taxaFaltas(r) >= 10 ? COR.vermelhoTexto : undefined}
            />
          </View>

          <Secao titulo="Destaques do período">
            <View style={s.destaques}>
              {lista.map((t, i) => (
                <Text key={i} style={s.destaqueLinha}>
                  <Text style={{ color: COR.vermelho, fontFamily: "Helvetica-Bold" }}>•  </Text>
                  {t}
                </Text>
              ))}
            </View>
          </Secao>

          {serie.length > 1 && (
            <Secao titulo={serie.length > 31 || (serie[0] && serie[0].rotulo.length > 2) ? "Faturamento por mês" : "Faturamento por dia"}>
              <GraficoColunas pontos={serie} />
            </Secao>
          )}

          <View style={s.colunas} wrap={false}>
            <View style={s.coluna}>
              <Secao titulo="Formas de pagamento">
                <GraficoBarras
                  itens={r.por_pagamento.map((x) => ({ rotulo: rotuloPagamento(x.forma), valor: Number(x.valor), nota: `${x.qtd} atendimento${x.qtd === 1 ? "" : "s"}` }))}
                />
              </Secao>
            </View>
            <View style={s.coluna}>
              <Secao titulo="Tipos de serviço">
                <GraficoBarras
                  itens={r.por_categoria.map((x) => ({ rotulo: rotuloCategoria(x.categoria), valor: Number(x.valor), nota: `${x.qtd} serviço${x.qtd === 1 ? "" : "s"}` }))}
                />
              </Secao>
            </View>
          </View>

          {variosProf && (
            <Secao titulo="Por profissional">
              <Tabela
                colunas={["Profissional", "Atendimentos", "Ticket médio", "% do total", "Valor"]}
                larguras={[3, 1.4, 1.4, 1.2, 1.5]}
                linhas={r.por_profissional.map((x) => [
                  x.nome,
                  String(x.qtd),
                  moeda(x.qtd ? Number(x.valor) / x.qtd : 0),
                  `${total ? Math.round((Number(x.valor) / total) * 100) : 0}%`,
                  moeda(Number(x.valor)),
                ])}
                total={["Total", String(r.atendimentos), moeda(ticketMedio(r)), "100%", moeda(total)]}
              />
            </Secao>
          )}

          {semana.some((x) => x.valor > 0) && (
            <Secao titulo="Por dia da semana">
              <GraficoBarras umaCor itens={semana.map((x) => ({ rotulo: x.dia, valor: x.valor, nota: `${x.qtd} atendimento${x.qtd === 1 ? "" : "s"}` }))} />
            </Secao>
          )}

          <Secao titulo="Serviços" quebrar>
            {r.por_servico.length === 0 ? (
              <Text style={{ color: COR.suave }}>Nenhum serviço fechado no período.</Text>
            ) : (
              <Tabela
                colunas={["Serviço", "Qtd.", "Com desconto", "% do total", "Valor"]}
                larguras={[3, 1, 1.4, 1.2, 1.5]}
                linhas={r.por_servico.map((x) => [
                  x.nome,
                  String(x.qtd),
                  String(x.promocoes),
                  `${total ? Math.round((Number(x.valor) / total) * 100) : 0}%`,
                  moeda(Number(x.valor)),
                ])}
                total={["Total", String(r.por_servico.reduce((t, x) => t + x.qtd, 0)), String(r.qtd_promocoes), "100%", moeda(total)]}
              />
            )}
          </Secao>

          {a && (
            <Secao titulo={`Comparação com ${dataCurta(d.anteriorDe)}${d.anteriorDe === d.anteriorAte ? "" : ` a ${dataCurta(d.anteriorAte)}`}`}>
              <Tabela
                colunas={["Indicador", "Este período", "Anterior", "Variação"]}
                larguras={[2.4, 1.5, 1.5, 1.2]}
                linhas={[
                  ["Total recebido", moeda(total), moeda(Number(a.total)), fmtVar(vTotal)],
                  ["Atendimentos", String(r.atendimentos), String(a.atendimentos), fmtVar(vAtend)],
                  ["Ticket médio", moeda(ticketMedio(r)), moeda(ticketMedio(a)), fmtVar(vTicket)],
                  ["Faltas", String(r.faltas), String(a.faltas), fmtVar(variacao(r.faltas, a.faltas))],
                  ["Descontos", moeda(descontos(r)), moeda(descontos(a)), fmtVar(variacao(descontos(r), descontos(a)))],
                ]}
              />
            </Secao>
          )}

          {d.de !== d.ate && r.por_dia.length > 0 && (
            <Secao titulo="Dia a dia" quebrar>
              <Tabela
                colunas={["Dia", "Atendimentos", "Valor"]}
                larguras={[3, 1.5, 1.5]}
                linhas={r.por_dia.map((x) => [`${dataCurta(x.dia)} (${serieDia(x.dia)})`, String(x.qtd), moeda(Number(x.valor))])}
                total={["Total", String(r.por_dia.reduce((t, x) => t + x.qtd, 0)), moeda(total)]}
              />
            </Secao>
          )}
        </View>

        <View style={s.rodape} fixed>
          <Text>Seu Barbeiro · {d.barbearia.nome} · gerado em {geradoEm}</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

const curta = (v: number | null) => (v === null ? "sem comparação" : `${v > 0 ? "+" : ""}${Math.round(v)}% vs. período anterior`);
const fmtVar = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : ""}${Math.round(v)}%`);
const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const serieDia = (dia: string) => DIAS[new Date(`${dia}T12:00:00Z`).getUTCDay()];

export async function gerarPdfRelatorio(d: DadosRelatorio, geradoEm: string) {
  return renderToBuffer(<RelatorioPdf d={d} geradoEm={geradoEm} />);
}
