/**
 * Ladrilhos OBR Robótica de Resgate — medidas oficiais (mm → cm).
 * Fonte: "Sugestões de Ladrilhos" OBR / RoboCup Junior Rescue.
 *
 * Constantes-chave:
 *   TILE = 30 cm (300 mm)
 *   LINE =  2 cm ( 20 mm)  — largura da faixa preta
 *   MARG = 14 cm (140 mm)  — do bordo até o início da faixa (centro da linha em 15 cm)
 *
 * Portas (N,E,S,W): a faixa encontra a borda no centro (15 cm),
 * assim ladrilhos adjacentes completam a linha um no outro.
 */
(function (global) {
  const TILE_CM = 30;
  const LINE_CM = 2;
  const MARG_CM = 14; // 140 mm
  const CX = TILE_CM / 2; // 15
  const NIVEL_CM = 10;

  const CATEGORIAS = [
    { id: 'pista', titulo: 'Pista (linha preta)', cor: '#3ecf8e' },
    { id: 'perigo', titulo: 'Perigos e variações', cor: '#f0a020' },
    { id: 'vertical', titulo: 'Elementos verticais', cor: '#6cb6ff' },
    { id: 'resgate', titulo: 'Sala de resgate', cor: '#c084fc' },
  ];

  /**
   * Portas padrão: bordas onde a linha de 20 mm toca o centro.
   * rot 0 = desenho “como no PDF” (entrada tipicamente em S).
   */
  const BLOCOS = {
    // p.1 — reta N–S
    'obr-reta': {
      id: 'obr-reta', cat: 'pista', nome: 'Reta',
      w: 1, h: 1, ports: ['N', 'S'],
      desc: 'Faixa 20 mm centrada · 300×300 mm',
    },
    // p.2 — T
    'obr-t': {
      id: 'obr-t', cat: 'pista', nome: 'Junção T',
      w: 1, h: 1, ports: ['N', 'E', 'W', 'S'],
      desc: 'T com haste para a borda',
    },
    // p.3 — gap (lacuna)
    'obr-gap': {
      id: 'obr-gap', cat: 'perigo', nome: 'Gap (lacuna)',
      w: 1, h: 1, ports: ['N', 'S'],
      desc: 'Linha interrompida no centro (100 mm)',
    },
    // p.4 — gap com pedaços
    'obr-gap-blocos': {
      id: 'obr-gap-blocos', cat: 'perigo', nome: 'Gap com blocos',
      w: 1, h: 1, ports: ['N', 'S'],
      desc: 'Segmentos curtos na linha',
    },
    // p.5 — cotovelo 135°
    'obr-cotovelo135': {
      id: 'obr-cotovelo135', cat: 'pista', nome: 'Cotovelo 135°',
      w: 1, h: 1, ports: ['N', 'S'],
      desc: 'Desvio angular 135°',
    },
    // p.6 — onda / S suave
    'obr-onda': {
      id: 'obr-onda', cat: 'pista', nome: 'Onda (S)',
      w: 1, h: 1, ports: ['N', 'S'],
      desc: 'Curva suave tipo S',
    },
    // p.7 — degraus / zigue
    'obr-degraus': {
      id: 'obr-degraus', cat: 'pista', nome: 'Degraus',
      w: 1, h: 1, ports: ['N', 'S'],
      desc: 'Linha em degraus',
    },
    // p.8 — S em esquadro
    'obr-s-esquadro': {
      id: 'obr-s-esquadro', cat: 'pista', nome: 'S em esquadro',
      w: 1, h: 1, ports: ['N', 'S'],
      desc: 'S com cantos retos',
    },
    // p.9 — zigue 45°
    'obr-zigue45': {
      id: 'obr-zigue45', cat: 'pista', nome: 'Zigue-zague 45°',
      w: 1, h: 1, ports: ['N', 'S'],
      desc: 'Dois cotovelos 45°',
    },
    // p.10 — zigue contínuo
    'obr-zigue': {
      id: 'obr-zigue', cat: 'pista', nome: 'Zigue-zague',
      w: 1, h: 1, ports: ['N', 'S'],
      desc: 'Serra contínua',
    },
    // p.13 — curva 90° canto
    'obr-curva90': {
      id: 'obr-curva90', cat: 'pista', nome: 'Curva 90°',
      w: 1, h: 1, ports: ['E', 'S'],
      desc: 'Cantoneira 90° (bordas E e S)',
    },
    // p.16 — arco 90°
    'obr-arco90': {
      id: 'obr-arco90', cat: 'pista', nome: 'Arco 90°',
      w: 1, h: 1, ports: ['E', 'S'],
      desc: 'Curva em arco suave',
    },
    // p.26 — cruz
    'obr-cruz': {
      id: 'obr-cruz', cat: 'pista', nome: 'Interseção sem marcação',
      w: 1, h: 1, ports: ['N', 'E', 'S', 'W'],
      desc: 'Cruz — seguir reto (OBR 10 pts)',
    },
    'obr-cruz-verde': {
      id: 'obr-cruz-verde', cat: 'pista', nome: 'Interseção + verde',
      w: 1, h: 1, ports: ['N', 'E', 'S', 'W'],
      desc: 'Marcação verde 2,5×2,5 cm antes do cruzamento',
    },
    'obr-marcacao-verde': {
      id: 'obr-marcacao-verde', cat: 'pista', nome: 'Só marcação verde',
      w: 1, h: 1, ports: ['N', 'S'],
      desc: 'Quadrado verde 2,5 cm na linha (direção)',
    },
    // p.23 — T horizontal topo
    'obr-t-topo': {
      id: 'obr-t-topo', cat: 'pista', nome: 'T (travessa)',
      w: 1, h: 1, ports: ['E', 'W', 'S'],
      desc: 'Travessa horizontal + haste S',
    },
    // p.12 — diagonal 45°
    'obr-diag45': {
      id: 'obr-diag45', cat: 'pista', nome: 'Diagonal 45°',
      w: 1, h: 1, ports: ['E', 'S'],
      desc: 'Trecho a 45° até a borda',
    },
    // p.25 — U / beco
    'obr-beco': {
      id: 'obr-beco', cat: 'pista', nome: 'Beco (U)',
      w: 1, h: 1, ports: ['W'],
      desc: 'Linha em U / beco sem saída',
    },
    // p.20 — rotatória
    'obr-rotatoria': {
      id: 'obr-rotatoria', cat: 'pista', nome: 'Rotatória',
      w: 1, h: 1, ports: ['E', 'S'],
      desc: 'Anel Ø200 mm com saídas',
    },
    // piso vazio
    'obr-vazio': {
      id: 'obr-vazio', cat: 'pista', nome: 'Piso vazio',
      w: 1, h: 1, ports: [],
      desc: 'Ladrilho sem linha',
    },

    // verticais / resgate (mesmo sistema de grade)
    'obr-rampa': {
      id: 'obr-rampa', cat: 'vertical', nome: 'Rampa',
      w: 1, h: 1, ports: ['N', 'S'], sobeNivel: 1,
      desc: 'Transição de nível (OBR)',
    },
    'obr-elevado': {
      id: 'obr-elevado', cat: 'vertical', nome: 'Piso elevado',
      w: 1, h: 1, gy: 1, ports: [],
      desc: 'Ladrilho no andar superior',
    },
    'obr-pilar': {
      id: 'obr-pilar', cat: 'vertical', nome: 'Pilar',
      w: 1, h: 1, ports: [],
      desc: 'Sustentação / passagem inferior',
    },
    'obr-ponte': {
      id: 'obr-ponte', cat: 'vertical', nome: 'Ponte',
      w: 1, h: 1, gy: 1, ports: [],
      desc: 'Vão elevado',
    },
    'obr-resgate-3x3': {
      id: 'obr-resgate-3x3', cat: 'resgate', nome: 'Sala resgate 3×3',
      w: 3, h: 3, multi: true, ports: [],
      desc: 'Módulo 90×90 cm com contenção',
    },
    'obr-resgate-3x4': {
      id: 'obr-resgate-3x4', cat: 'resgate', nome: 'Sala resgate 3×4',
      w: 3, h: 4, multi: true, ports: [],
      desc: 'Módulo 90×120 cm',
    },
    'obr-fita-prata': {
      id: 'obr-fita-prata', cat: 'resgate', nome: 'Fita prateada',
      w: 1, h: 1, ports: ['N', 'S'],
      desc: 'Entrada da sala',
    },
    'obr-fita-preta': {
      id: 'obr-fita-preta', cat: 'resgate', nome: 'Fita preta saída',
      w: 1, h: 1, ports: ['N', 'S'],
      desc: 'Saída da sala',
    },
    'obr-tri-verde': {
      id: 'obr-tri-verde', cat: 'resgate', nome: 'Triângulo verde',
      w: 1, h: 1, ports: [],
      desc: 'Área de evacuação',
    },
    'obr-tri-vermelho': {
      id: 'obr-tri-vermelho', cat: 'resgate', nome: 'Triângulo vermelho',
      w: 1, h: 1, ports: [],
      desc: 'Área de evacuação',
    },
  };

  /** Desenha faixa com largura LINE_CM ao longo de um caminho de pontos (cm locais do ladrilho). */
  function strokePath(ctx, pts, closed) {
    if (!pts || pts.length < 2) return;
    ctx.save();
    ctx.strokeStyle = '#111';
    ctx.fillStyle = '#111';
    ctx.lineWidth = LINE_CM;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (closed) ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function rectLine(ctx, x, y, w, h) {
    ctx.fillStyle = '#111';
    ctx.fillRect(x, y, w, h);
  }

  /**
   * Desenha o padrão oficial do ladrilho em coords locais 0..30 cm
   * (antes da rotação do bloco na grade).
   */
  function desenharPadrao(ctx, tipo) {
    const T = TILE_CM, L = LINE_CM, M = MARG_CM, C = CX;

    // piso branco
    ctx.fillStyle = '#f4f3ee';
    ctx.fillRect(0, 0, T, T);

    switch (tipo) {
      case 'obr-reta':
        // faixa vertical centrada 20 mm
        rectLine(ctx, M, 0, L, T);
        break;
      case 'obr-t':
        // haste S + travessa no meio (PDF p.2)
        rectLine(ctx, M, C - L / 2, 15, L); // braço esq–dir simplificado
        rectLine(ctx, C - L / 2, C - L / 2, L, T - (C - L / 2)); // haste para S
        rectLine(ctx, C - 7.5, C - L / 2, 15, L); // topo T 150 mm
        break;
      case 'obr-t-topo':
        rectLine(ctx, 0, C - L / 2, T, L);
        rectLine(ctx, M, C - L / 2, L, T - (C - L / 2));
        break;
      case 'obr-cruz':
        rectLine(ctx, M, 0, L, T);
        rectLine(ctx, 0, M, T, L);
        break;
      case 'obr-cruz-verde':
        // OBR: interseção COM marcação — verde 2,5×2,5 cm logo ANTES do cruzamento
        // (região interna). Rotação do bloco posiciona de qual braço o robô “lê” a direção.
        rectLine(ctx, M, 0, L, T);
        rectLine(ctx, 0, M, T, L);
        {
          const g = 2.5;
          // Sul do centro, centrado na linha vertical = aproximação típica do manual
          ctx.fillStyle = '#22a85a';
          ctx.fillRect(C - g / 2, C + L / 2 + 0.4, g, g);
        }
        break;
      case 'obr-marcacao-verde':
        rectLine(ctx, M, 0, L, T);
        {
          const g = 2.5;
          ctx.fillStyle = '#2d8a4e';
          ctx.fillRect(C - g / 2, C - g / 2, g, g);
        }
        break;

      case 'obr-gap': {
        // dois segmentos com gap 100 mm no meio (p.3)
        rectLine(ctx, M, 0, L, 10);
        rectLine(ctx, M, 20, L, 10);
        break;
      }
      case 'obr-gap-blocos': {
        rectLine(ctx, M, 0, L, 2.5);
        rectLine(ctx, M, 12.5, L, 5);
        rectLine(ctx, M, 27.5, L, 2.5);
        break;
      }
      case 'obr-curva90':
        // L no canto inferior direito (portas E e S)
        rectLine(ctx, M, T - M - L, T - M, L);
        rectLine(ctx, M, M, L, T - M - L + L);
        break;
      case 'obr-arco90': {
        ctx.save();
        ctx.strokeStyle = '#111';
        ctx.lineWidth = L;
        ctx.lineCap = 'butt';
        ctx.beginPath();
        // arco do centro-ish para E e S
        ctx.arc(T, T, T - M - L / 2, Math.PI, -Math.PI / 2, false);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'obr-diag45': {
        strokePath(ctx, [[M + L / 2, T], [T, M + L / 2]]);
        break;
      }
      case 'obr-cotovelo135':
        strokePath(ctx, [[C, 0], [C, 12], [10, 17], [C, 22], [C, T]]);
        break;
      case 'obr-onda':
        ctx.save();
        ctx.strokeStyle = '#111';
        ctx.lineWidth = L;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(C, 0);
        ctx.bezierCurveTo(C + 8, 8, C - 8, 14, C, 18);
        ctx.bezierCurveTo(C + 8, 22, C - 4, 26, C, T);
        ctx.stroke();
        ctx.restore();
        break;
      case 'obr-degraus':
        strokePath(ctx, [
          [C, 0], [C, 6], [10, 6], [10, 12], [C, 12], [C, 20],
          [18, 20], [18, 26], [C, 26], [C, T],
        ]);
        break;
      case 'obr-s-esquadro':
        strokePath(ctx, [
          [C, 0], [C, 4], [8, 4], [8, 11], [C, 11], [C, 19],
          [8, 19], [8, 26], [C, 26], [C, T],
        ]);
        break;
      case 'obr-zigue45':
        strokePath(ctx, [[C, 0], [8, 10], [C, 20], [C, T]]);
        break;
      case 'obr-zigue':
        strokePath(ctx, [
          [C, 0], [C + 5, 4], [C - 5, 8], [C + 5, 12],
          [C - 5, 16], [C + 5, 20], [C - 5, 24], [C, T],
        ]);
        break;
      case 'obr-beco':
        // U aberto para W
        rectLine(ctx, M, M, T - M, L);
        rectLine(ctx, T - L, M, L, T - 2 * M);
        rectLine(ctx, M, T - M - L, T - M, L);
        break;
      case 'obr-rotatoria': {
        ctx.save();
        ctx.strokeStyle = '#111';
        ctx.lineWidth = L;
        ctx.beginPath();
        ctx.arc(C, C, 10, 0, Math.PI * 2); // ~Ø200 mm outer
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(C, C, 8, 0, Math.PI * 2); // inner
        ctx.stroke();
        // clear center ring fill look
        ctx.restore();
        rectLine(ctx, C - L / 2, C + 8, L, T - (C + 8)); // S
        rectLine(ctx, C + 8, C - L / 2, T - (C + 8), L); // E
        break;
      }
      case 'obr-rampa':
        ctx.fillStyle = '#6a9cc4';
        ctx.beginPath();
        ctx.moveTo(0, T); ctx.lineTo(T, T); ctx.lineTo(T, T * 0.35); ctx.closePath();
        ctx.fill();
        rectLine(ctx, M, 0, L, T);
        break;
      case 'obr-elevado':
        ctx.fillStyle = '#c5d4e8';
        ctx.fillRect(0, 0, T, T);
        ctx.strokeStyle = '#456';
        ctx.strokeRect(1, 1, T - 2, T - 2);
        break;
      case 'obr-pilar':
        ctx.fillStyle = '#5a6570';
        ctx.fillRect(C - 4, C - 4, 8, 8);
        break;
      case 'obr-ponte':
        ctx.fillStyle = '#a8b8d0';
        ctx.fillRect(0, 0, T, T);
        ctx.fillStyle = '#1a2030';
        ctx.fillRect(4, 10, T - 8, 10);
        break;
      case 'obr-resgate-3x3':
      case 'obr-resgate-3x4': {
        const bw = tipo.endsWith('3x4') ? 90 : 90;
        const bh = tipo.endsWith('3x4') ? 120 : 90;
        ctx.fillStyle = '#2a2a32';
        ctx.fillRect(0, 0, bw, bh);
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(1, 1, bw - 2, bh - 2);
        ctx.fillStyle = '#ccc';
        ctx.font = '8px sans-serif';
        ctx.fillText('RESGATE', 8, bh / 2);
        break;
      }
      case 'obr-fita-prata':
        ctx.fillStyle = '#c8c8d0';
        ctx.fillRect(M, 0, L, T);
        break;
      case 'obr-fita-preta':
        rectLine(ctx, M, 0, L, T);
        break;
      case 'obr-tri-verde':
        ctx.fillStyle = '#2d8a4e';
        ctx.beginPath();
        ctx.moveTo(0, T); ctx.lineTo(T, T); ctx.lineTo(0, 0); ctx.closePath();
        ctx.fill();
        break;
      case 'obr-tri-vermelho':
        ctx.fillStyle = '#b33a3a';
        ctx.beginPath();
        ctx.moveTo(0, T); ctx.lineTo(T, T); ctx.lineTo(0, 0); ctx.closePath();
        ctx.fill();
        break;
      case 'obr-vazio':
      default:
        break;
    }

    // moldura do ladrilho
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 0.25;
    ctx.strokeRect(0, 0, T, T);
  }

  global.ObrCatalogo = {
    TILE_CM, LINE_CM, MARG_CM, CX, NIVEL_CM,
    CATEGORIAS, BLOCOS, desenharPadrao,
  };
})(typeof window !== 'undefined' ? window : globalThis);
