window.DADOS = {
 "versao": 2,
 "atualizado": "2026-11-09T12:00:00.000Z",
 "locais": {
  "andar1": {
   "nome": "1º Andar",
   "aba": "Todas as salas",
   "titulo": "1º Andar · planta baixa",
   "sub": "Pavimento principal com as salas, serviços e circulação · sem escala",
   "icone": "i-predio",
   "foto": "assets/croqui/andar1.jpg",
   "paredes": [
    [
     0,
     20,
     350,
     20,
     1
    ],
    [
     350,
     20,
     350,
     0,
     1
    ],
    [
     350,
     0,
     495,
     0,
     1
    ],
    [
     495,
     0,
     495,
     20,
     1
    ],
    [
     495,
     20,
     1000,
     20,
     1
    ],
    [
     1000,
     20,
     1000,
     640,
     1
    ],
    [
     1000,
     640,
     672,
     640,
     1
    ],
    [
     672,
     640,
     672,
     330,
     1
    ],
    [
     672,
     330,
     500,
     330,
     1
    ],
    [
     352,
     330,
     0,
     330,
     1
    ],
    [
     0,
     330,
     0,
     20,
     1
    ],
    [
     290,
     20,
     290,
     150,
     0
    ],
    [
     0,
     150,
     290,
     150,
     0
    ],
    [
     0,
     200,
     290,
     200,
     0
    ],
    [
     290,
     200,
     290,
     330,
     0
    ],
    [
     560,
     20,
     560,
     150,
     0
    ],
    [
     560,
     150,
     572,
     150,
     0
    ],
    [
     600,
     150,
     632,
     150,
     0
    ],
    [
     658,
     150,
     672,
     150,
     0
    ],
    [
     672,
     20,
     672,
     150,
     0
    ],
    [
     672,
     150,
     812,
     150,
     0
    ],
    [
     812,
     20,
     812,
     490,
     0
    ],
    [
     812,
     250,
     1000,
     250,
     0
    ],
    [
     812,
     355,
     1000,
     355,
     0
    ],
    [
     812,
     400,
     1000,
     400,
     0
    ],
    [
     560,
     230,
     672,
     230,
     0
    ],
    [
     560,
     230,
     560,
     330,
     0
    ],
    [
     618,
     230,
     618,
     330,
     0
    ],
    [
     672,
     230,
     672,
     330,
     0
    ]
   ],
   "portas": [
    {
     "x": 393,
     "y": 0,
     "o": "h",
     "w": 29,
     "lado": 1
    },
    {
     "x": 422,
     "y": 0,
     "o": "h",
     "w": 29,
     "lado": 1,
     "inv": true
    },
    {
     "x": 240,
     "y": 150,
     "o": "h",
     "w": 30,
     "lado": -1
    },
    {
     "x": 240,
     "y": 200,
     "o": "h",
     "w": 30,
     "lado": 1
    },
    {
     "x": 772,
     "y": 150,
     "o": "h",
     "w": 28,
     "lado": -1,
     "inv": true
    },
    {
     "x": 812,
     "y": 66,
     "o": "v",
     "w": 28,
     "lado": 1
    },
    {
     "x": 812,
     "y": 194,
     "o": "v",
     "w": 28,
     "lado": 1
    },
    {
     "x": 812,
     "y": 288,
     "o": "v",
     "w": 28,
     "lado": 1
    },
    {
     "x": 812,
     "y": 364,
     "o": "v",
     "w": 28,
     "lado": 1
    },
    {
     "x": 572,
     "y": 230,
     "o": "h",
     "w": 26,
     "lado": 1
    },
    {
     "x": 630,
     "y": 230,
     "o": "h",
     "w": 26,
     "lado": 1
    },
    {
     "x": 672,
     "y": 406,
     "o": "v",
     "w": 36,
     "lado": -1
    }
   ],
   "marcas": [
    {
     "t": "ENTRADA",
     "x": 422,
     "y": -46,
     "seta": [
      422,
      -38,
      422,
      -8
     ]
    },
    {
     "t": "SAÍDA",
     "x": 426,
     "y": 386,
     "seta": [
      426,
      338,
      426,
      368
     ]
    },
    {
     "t": "PORTA",
     "x": 626,
     "y": 424,
     "seta": [
      666,
      424,
      634,
      424
     ],
     "ancora": "end"
    },
    {
     "t": "VOCÊ ESTÁ AQUI",
     "x": 906,
     "y": 666,
     "seta": [
      907,
      654,
      921,
      590
     ],
     "aqui": true
    }
   ],
   "textos": [
    {
     "t": "ÁREA EXTERNA",
     "x": 330,
     "y": 520
    }
   ],
   "ambientes": [
    {
     "id": "vestibulo",
     "nome": "Entrada",
     "rot": [],
     "cat": "circ",
     "tipo": "piso",
     "x": 350,
     "y": 0,
     "w": 145,
     "h": 20,
     "croqui": "Entrada",
     "moveis": "Porta dupla de acesso",
     "acesso": "Acesso principal do prédio"
    },
    {
     "id": "hall",
     "nome": "Hall de entrada",
     "cat": "circ",
     "tipo": "piso",
     "x": 290,
     "y": 20,
     "w": 270,
     "h": 310,
     "croqui": "Entrada / saída",
     "moveis": "Recepção, área de descanso e refeitório abertos para o hall",
     "acesso": "Entrada principal no topo e saída na parte de baixo",
     "ly": 166
    },
    {
     "id": "circ-oeste",
     "nome": "Circulação",
     "cat": "circ",
     "tipo": "piso",
     "x": 0,
     "y": 150,
     "w": 290,
     "h": 50,
     "croqui": "(espaço entre as salas multiuso)",
     "moveis": "—",
     "acesso": "Liga o hall aos Auditórios 1 e 2",
     "ly": 27
    },
    {
     "id": "circ-centro",
     "nome": "Circulação central",
     "rot": [],
     "cat": "circ",
     "tipo": "piso",
     "x": 560,
     "y": 150,
     "w": 112,
     "h": 80,
     "croqui": "—",
     "moveis": "—",
     "acesso": "Liga o hall à escada, aos sanitários e à circulação leste"
    },
    {
     "id": "circ-leste",
     "nome": "Circulação",
     "cat": "circ",
     "tipo": "piso",
     "x": 672,
     "y": 150,
     "w": 140,
     "h": 490,
     "desenho": "<path class=\"m\" d=\"M760 352H806V404H760V392H794V364H760Z\"/><text class=\"txt-m\" x=\"783\" y=\"344\">Sofá</text><rect class=\"m\" x=\"764\" y=\"424\" width=\"36\" height=\"34\" rx=\"4\"/><text class=\"txt-m\" x=\"782\" y=\"444\">Mesa</text>",
     "croqui": "sofá / Mesa",
     "moveis": "Sofá e mesa junto à parede do bloco administrativo",
     "acesso": "Liga a Sala Óculos, a Cozinha Complexo, o bloco administrativo e a área de mesas",
     "ly": 48,
     "ref": [
      672,
      150
     ]
    },
    {
     "id": "mu02",
     "nome": "Auditório 2",
     "cat": "ensino",
     "tipo": "sala",
     "x": 0,
     "y": 20,
     "w": 290,
     "h": 130,
     "tam": 17,
     "croqui": "Multi Uso 2 / Multi Uso 02",
     "moveis": "Layout interno não detalhado no croqui",
     "acesso": "Pela circulação entre os auditórios (porta estimada)",
     "postit": {
      "cor": "rosa",
      "texto": "seg. 801 M / 801 vesp"
     },
     "aulas": {
      "seg": {
       "m": [
        "801"
       ],
       "t": [
        "801"
       ]
      }
     },
     "ly": 50
    },
    {
     "id": "mu01",
     "nome": "Auditório 1",
     "cat": "ensino",
     "tipo": "sala",
     "x": 0,
     "y": 200,
     "w": 290,
     "h": 130,
     "tam": 17,
     "croqui": "Multi uso 01 / Multi Uso 01",
     "moveis": "Layout interno não detalhado no croqui",
     "acesso": "Pela circulação entre os auditórios (porta estimada)",
     "postit": {
      "cor": "amarelo",
      "texto": "seg. 701 M / 901 vesp"
     },
     "aulas": {
      "seg": {
       "m": [
        "701"
       ],
       "t": [
        "901"
       ]
      }
     },
     "ly": 55
    },
    {
     "id": "recepcao",
     "nome": "Recepção",
     "cat": "admin",
     "tipo": "sala",
     "x": 300,
     "y": 52,
     "w": 42,
     "h": 96,
     "rx": 6,
     "giro": -90,
     "tam": 12.5,
     "croqui": "Recepção",
     "moveis": "Balcão de atendimento",
     "acesso": "Hall de entrada, logo após a entrada principal"
    },
    {
     "id": "descanso",
     "nome": "Área de descanso",
     "rot": [
      "Área de",
      "descanso"
     ],
     "cat": "conv",
     "tipo": "zona",
     "x": 452,
     "y": 60,
     "w": 98,
     "h": 96,
     "rx": 14,
     "tam": 12,
     "desenho": "<rect class=\"m\" x=\"518\" y=\"82\" width=\"12\" height=\"44\" rx=\"3\"/><rect class=\"m\" x=\"462\" y=\"138\" width=\"60\" height=\"13\" rx=\"3\"/>",
     "croqui": "Área de descanso",
     "moveis": "Dois assentos/sofás (retângulos no croqui)",
     "acesso": "Aberta para o hall de entrada",
     "lx": 36,
     "ly": 40,
     "ref": [
      452,
      60
     ]
    },
    {
     "id": "escada",
     "nome": "Escada e elevador",
     "rot": [
      "Escada"
     ],
     "cat": "circ",
     "tipo": "sala",
     "x": 560,
     "y": 20,
     "w": 112,
     "h": 130,
     "tam": 11.5,
     "desenho": "<rect class=\"m\" x=\"616\" y=\"28\" width=\"48\" height=\"118\"/><path class=\"m-l\" d=\"M616 38H664M616 48H664M616 58H664M616 68H664M616 78H664M616 88H664M616 98H664M616 108H664M616 118H664M616 128H664M616 138H664\"/><path class=\"m-seta\" d=\"M640 132V44M634 52l6-8 6 8\"/><rect class=\"m\" x=\"566\" y=\"100\" width=\"42\" height=\"46\"/><path class=\"m-l\" d=\"M566 100L608 146M608 100L566 146\"/><path class=\"m-seta\" d=\"M574 150H598\"/>",
     "croqui": "escada / Elevador",
     "moveis": "Escada e elevador de acesso ao 2º andar (Maker)",
     "acesso": "Portas do elevador e da escada voltadas para o hall",
     "lx": 28,
     "ly": 42,
     "ref": [
      560,
      20
     ]
    },
    {
     "id": "sala3d",
     "nome": "Sala Óculos",
     "sub": "Óculos 3D",
     "cat": "lab",
     "tipo": "sala",
     "x": 672,
     "y": 20,
     "w": 140,
     "h": 130,
     "croqui": "sala 3D / óculos 3d",
     "moveis": "Óculos 3D (anotação no croqui)",
     "acesso": "Porta no canto inferior direito, para a circulação",
     "postit": {
      "cor": "laranja",
      "texto": "Seg. / Prof (sublinhado)"
     },
     "aulas": {
      "seg": {
       "d": [
        "Prof."
       ]
      }
     },
     "obs": "“Prof” provavelmente indica uso pelos professores; o post-it não informa o turno.",
     "ly": 50
    },
    {
     "id": "labinfo",
     "nome": "Lab. Info. Complexo",
     "cat": "lab",
     "tipo": "sala",
     "x": 812,
     "y": 20,
     "w": 188,
     "h": 230,
     "croqui": "Lab Info (escrito duas vezes)",
     "moveis": "Layout interno não detalhado no croqui",
     "acesso": "Duas portas para a circulação",
     "postit": {
      "cor": "limao",
      "texto": "seg. 601 M / 701 Vesp."
     },
     "aulas": {
      "seg": {
       "m": [
        "601"
       ],
       "t": [
        "701"
       ]
      }
     },
     "ly": 100
    },
    {
     "id": "adm",
     "nome": "Administração",
     "cat": "admin",
     "tipo": "sala",
     "x": 812,
     "y": 250,
     "w": 188,
     "h": 105,
     "croqui": "Adm",
     "moveis": "Layout interno não detalhado no croqui",
     "acesso": "Porta para a circulação"
    },
    {
     "id": "ti",
     "nome": "TI",
     "cat": "admin",
     "tipo": "sala",
     "x": 812,
     "y": 355,
     "w": 188,
     "h": 45,
     "croqui": "TI",
     "moveis": "Layout interno não detalhado no croqui",
     "acesso": "Porta para a circulação"
    },
    {
     "id": "arquibancada",
     "nome": "Arquibancada",
     "cat": "conv",
     "tipo": "sala",
     "x": 812,
     "y": 400,
     "w": 188,
     "h": 90,
     "desenho": "<rect class=\"m\" x=\"814\" y=\"402\" width=\"26\" height=\"86\"/><path class=\"m-l\" d=\"M814 412H840M814 422H840M814 432H840M814 442H840M814 452H840M814 462H840M814 472H840M814 482H840\"/><path class=\"m-l\" d=\"M840 418H998M840 436H998M840 454H998M840 472H998\"/>",
     "croqui": "Arquibancada / escad.",
     "moveis": "Arquibancada em degraus com escada lateral",
     "acesso": "Aberta para a área Multiuso Livre",
     "lx": 108,
     "ref": [
      812,
      400
     ]
    },
    {
     "id": "livre",
     "nome": "Multiuso Livre",
     "rot": [
      "Multiuso",
      "Livre"
     ],
     "cat": "ensino",
     "tipo": "zona",
     "x": 812,
     "y": 490,
     "w": 188,
     "h": 150,
     "desenho": "<path class=\"m\" d=\"M896 512H964V612H880V600H952V524H896Z\"/>",
     "croqui": "Multi uso Livre",
     "moveis": "Bancada em “U”",
     "acesso": "Espaço aberto, integrado à área de mesas e à arquibancada",
     "postit": {
      "cor": "laranja",
      "texto": "Seg (sem turma anotada)"
     },
     "aulas": {
      "seg": {}
     },
     "lx": 40,
     "ly": 50,
     "ref": [
      812,
      490
     ]
    },
    {
     "id": "mesas",
     "nome": "Área de mesas",
     "rot": [
      "Área de",
      "mesas"
     ],
     "cat": "conv",
     "tipo": "zona",
     "x": 678,
     "y": 484,
     "w": 128,
     "h": 152,
     "rx": 12,
     "tam": 13,
     "desenho": "<circle class=\"m\" cx=\"708\" cy=\"572\" r=\"14\"/><circle class=\"m\" cx=\"708\" cy=\"616\" r=\"14\"/><circle class=\"m\" cx=\"778\" cy=\"572\" r=\"14\"/><circle class=\"m\" cx=\"778\" cy=\"616\" r=\"14\"/>",
     "croqui": "mesa (4 círculos)",
     "moveis": "4 mesas redondas",
     "acesso": "Integrada à circulação; porta para a área externa ao lado",
     "postit": {
      "cor": "limao",
      "texto": "Seg. SESI 602 M / 602 V"
     },
     "aulas": {
      "seg": {
       "m": [
        "SESI 602"
       ],
       "t": [
        "SESI 602"
       ]
      }
     },
     "ly": 20,
     "ref": [
      678,
      484
     ]
    },
    {
     "id": "bm",
     "nome": "Sanitário masculino",
     "rot": [
      "WC",
      "Masc."
     ],
     "cat": "serv",
     "tipo": "sala",
     "x": 560,
     "y": 230,
     "w": 58,
     "h": 100,
     "tam": 11,
     "desenho": "<ellipse class=\"m\" cx=\"577\" cy=\"298\" rx=\"6\" ry=\"7.5\"/><ellipse class=\"m\" cx=\"601\" cy=\"298\" rx=\"6\" ry=\"7.5\"/><ellipse class=\"m\" cx=\"577\" cy=\"320\" rx=\"6\" ry=\"7.5\"/><ellipse class=\"m\" cx=\"601\" cy=\"320\" rx=\"6\" ry=\"7.5\"/>",
     "croqui": "B.M",
     "moveis": "4 vasos sanitários",
     "acesso": "Pelo lado do refeitório",
     "ly": 40,
     "ref": [
      560,
      230
     ]
    },
    {
     "id": "bf",
     "nome": "Sanitário feminino",
     "rot": [
      "WC",
      "Fem."
     ],
     "cat": "serv",
     "tipo": "sala",
     "x": 618,
     "y": 230,
     "w": 54,
     "h": 100,
     "tam": 11,
     "desenho": "<ellipse class=\"m\" cx=\"633\" cy=\"298\" rx=\"6\" ry=\"7.5\"/><ellipse class=\"m\" cx=\"657\" cy=\"298\" rx=\"6\" ry=\"7.5\"/><ellipse class=\"m\" cx=\"633\" cy=\"320\" rx=\"6\" ry=\"7.5\"/><ellipse class=\"m\" cx=\"657\" cy=\"320\" rx=\"6\" ry=\"7.5\"/>",
     "croqui": "BF",
     "moveis": "4 vasos sanitários",
     "acesso": "Pelo lado do refeitório",
     "ly": 40,
     "ref": [
      618,
      230
     ]
    },
    {
     "id": "cozinha",
     "nome": "Cozinha Complexo",
     "cat": "serv",
     "tipo": "sala",
     "x": 674,
     "y": 232,
     "w": 24,
     "h": 110,
     "giro": -90,
     "tam": 11.5,
     "desenho": "<rect class=\"m-l\" x=\"678\" y=\"236\" width=\"16\" height=\"102\" rx=\"2\"/>",
     "croqui": "cozinha",
     "moveis": "Bancada linear junto à parede dos sanitários",
     "acesso": "Voltada para a circulação",
     "ref": [
      674,
      232
     ]
    },
    {
     "id": "refeitorio",
     "nome": "Refeitório (junto à cozinha)",
     "rot": [
      "Refeitório"
     ],
     "cat": "conv",
     "tipo": "zona",
     "forma": "elipse",
     "x": 477,
     "y": 222,
     "w": 76,
     "h": 100,
     "tam": 12,
     "croqui": "Refeitório (área à mão livre)",
     "moveis": "Não detalhado no croqui",
     "acesso": "Aberto para o hall",
     "obs": "O croqui traz o rótulo “Refeitório” em dois pontos. Confirmar se são dois espaços ou se um deles foi substituído."
    },
    {
     "id": "refeitorio2",
     "nome": "Refeitório (junto ao Auditório 1)",
     "cat": "conv",
     "tipo": "zona",
     "x": 300,
     "y": 206,
     "w": 124,
     "h": 104,
     "rx": 10,
     "tam": 12.5,
     "desenho": "<rect class=\"m\" x=\"341\" y=\"270\" width=\"12\" height=\"12\" rx=\"2\"/><circle class=\"m\" cx=\"366\" cy=\"276\" r=\"6\"/><circle class=\"m\" cx=\"382\" cy=\"276\" r=\"6\"/>",
     "croqui": "Refeitório □○○",
     "moveis": "Símbolos “□○○” — possivelmente mesa e cadeiras",
     "acesso": "Aberto para o hall, junto à saída",
     "obs": "O croqui traz o rótulo “Refeitório” em dois pontos. Confirmar se são dois espaços ou se um deles foi substituído.",
     "ly": 38,
     "ref": [
      300,
      206
     ],
     "rot": [
      "Refeitório"
     ]
    }
   ]
  },
  "andar2": {
   "nome": "2º Andar",
   "aba": "Maker",
   "titulo": "2º Andar · Maker",
   "sub": "Sala única no pavimento superior · sem escala",
   "icone": "i-camadas",
   "foto": "assets/croqui/andar2.jpg",
   "paredes": [
    [
     160,
     60,
     760,
     60,
     1
    ],
    [
     760,
     60,
     760,
     560,
     1
    ],
    [
     760,
     560,
     160,
     560,
     1
    ],
    [
     160,
     560,
     160,
     60,
     1
    ]
   ],
   "portas": [],
   "marcas": [],
   "textos": [
    {
     "t": "Posição no 2º pavimento e acessos não indicados no croqui",
     "x": 460,
     "y": 604,
     "nota": true
    }
   ],
   "ambientes": [
    {
     "id": "maker",
     "nome": "Maker",
     "sub": "Espaço maker · sala única",
     "cat": "ensino",
     "tipo": "sala",
     "x": 160,
     "y": 60,
     "w": 600,
     "h": 500,
     "tam": 30,
     "croqui": "Maker 2º Andar",
     "moveis": "Sem layout interno no croqui",
     "acesso": "Pela escada e elevador do 1º andar",
     "postit": {
      "cor": "limao",
      "texto": "Seg. 702 M / (linha riscada) / 702 Vesp / 601 Vesp"
     },
     "aulas": {
      "seg": {
       "m": [
        "702"
       ],
       "t": [
        "702",
        "601"
       ]
      }
     },
     "obs": "Há uma linha riscada no post-it (provavelmente “601 M”), mantida fora do quadro de aulas.",
     "ly": 230
    }
   ]
  },
  "carretas": {
   "nome": "Unidades Móveis",
   "aba": "4 carretas",
   "titulo": "Unidades Móveis · carretas",
   "sub": "Disposição das unidades móveis (carretas) conforme o croqui · sem escala",
   "icone": "i-carreta",
   "foto": "assets/croqui/carretas.jpg",
   "patio": [
    10,
    10,
    980,
    520
   ],
   "paredes": [],
   "portas": [],
   "marcas": [],
   "textos": [
    {
     "t": "ÁREA DAS CARRETAS",
     "x": 812,
     "y": 140
    }
   ],
   "ambientes": [
    {
     "id": "civil",
     "nome": "UM Civil",
     "sub": "Carreta",
     "cat": "lab",
     "tipo": "veiculo",
     "x": 40,
     "y": 40,
     "w": 180,
     "h": 460,
     "rx": 14,
     "tam": 19,
     "desenho": "<rect class=\"roda\" x=\"33\" y=\"408\" width=\"10\" height=\"18\" rx=\"2\"/><rect class=\"roda\" x=\"217\" y=\"408\" width=\"10\" height=\"18\" rx=\"2\"/><rect class=\"roda\" x=\"33\" y=\"434\" width=\"10\" height=\"18\" rx=\"2\"/><rect class=\"roda\" x=\"217\" y=\"434\" width=\"10\" height=\"18\" rx=\"2\"/><circle class=\"m\" cx=\"130\" cy=\"74\" r=\"6\"/><rect class=\"m-l\" x=\"52\" y=\"52\" width=\"156\" height=\"436\" rx=\"6\"/>",
     "moveis": "Laboratório móvel",
     "acesso": "Pátio das carretas",
     "croqui": "Civil",
     "postit": {
      "cor": "amarelo",
      "texto": "(em branco)"
     },
     "aulas": {
      "seg": {}
     },
     "ly": 210,
     "ref": [
      40,
      40
     ]
    },
    {
     "id": "eletrica",
     "nome": "UM Elétrica",
     "sub": "Carreta",
     "cat": "lab",
     "tipo": "veiculo",
     "x": 280,
     "y": 96,
     "w": 340,
     "h": 150,
     "rx": 14,
     "tam": 19,
     "desenho": "<rect class=\"roda\" x=\"528\" y=\"89\" width=\"18\" height=\"10\" rx=\"2\"/><rect class=\"roda\" x=\"528\" y=\"243\" width=\"18\" height=\"10\" rx=\"2\"/><rect class=\"roda\" x=\"554\" y=\"89\" width=\"18\" height=\"10\" rx=\"2\"/><rect class=\"roda\" x=\"554\" y=\"243\" width=\"18\" height=\"10\" rx=\"2\"/><circle class=\"m\" cx=\"314\" cy=\"171\" r=\"6\"/><rect class=\"m-l\" x=\"292\" y=\"108\" width=\"316\" height=\"126\" rx=\"6\"/>",
     "moveis": "Laboratório móvel",
     "acesso": "Pátio das carretas",
     "croqui": "Elétrica",
     "postit": {
      "cor": "limao",
      "texto": "(em branco)"
     },
     "aulas": {
      "seg": {}
     },
     "ly": 64,
     "ref": [
      280,
      96
     ]
    },
    {
     "id": "automacao",
     "nome": "UM Automação",
     "sub": "Carreta",
     "cat": "lab",
     "tipo": "veiculo",
     "x": 280,
     "y": 262,
     "w": 340,
     "h": 150,
     "rx": 14,
     "tam": 19,
     "desenho": "<rect class=\"roda\" x=\"528\" y=\"255\" width=\"18\" height=\"10\" rx=\"2\"/><rect class=\"roda\" x=\"528\" y=\"409\" width=\"18\" height=\"10\" rx=\"2\"/><rect class=\"roda\" x=\"554\" y=\"255\" width=\"18\" height=\"10\" rx=\"2\"/><rect class=\"roda\" x=\"554\" y=\"409\" width=\"18\" height=\"10\" rx=\"2\"/><circle class=\"m\" cx=\"314\" cy=\"337\" r=\"6\"/><rect class=\"m-l\" x=\"292\" y=\"274\" width=\"316\" height=\"126\" rx=\"6\"/>",
     "moveis": "Laboratório móvel",
     "acesso": "Pátio das carretas",
     "croqui": "Automação (grafado “Atomação”)",
     "postit": {
      "cor": "rosa",
      "texto": "seg. AI AMEA"
     },
     "aulas": {
      "seg": {
       "d": [
        "AI AMEA"
       ]
      }
     },
     "obs": "“AI” provavelmente é Aprendizagem Industrial; “AMEA” foi mantido como escrito. Turno não informado.",
     "ly": 64,
     "ref": [
      280,
      262
     ]
    },
    {
     "id": "mec",
     "nome": "UM Manutenção",
     "sub": "Carreta",
     "cat": "lab",
     "tipo": "veiculo",
     "x": 636,
     "y": 262,
     "w": 330,
     "h": 150,
     "rx": 14,
     "tam": 19,
     "desenho": "<rect class=\"roda\" x=\"874\" y=\"255\" width=\"18\" height=\"10\" rx=\"2\"/><rect class=\"roda\" x=\"874\" y=\"409\" width=\"18\" height=\"10\" rx=\"2\"/><rect class=\"roda\" x=\"900\" y=\"255\" width=\"18\" height=\"10\" rx=\"2\"/><rect class=\"roda\" x=\"900\" y=\"409\" width=\"18\" height=\"10\" rx=\"2\"/><circle class=\"m\" cx=\"670\" cy=\"337\" r=\"6\"/><rect class=\"m-l\" x=\"648\" y=\"274\" width=\"306\" height=\"126\" rx=\"6\"/>",
     "moveis": "Laboratório móvel",
     "acesso": "Pátio das carretas",
     "croqui": "Mec",
     "ly": 64,
     "ref": [
      636,
      262
     ]
    }
   ]
  }
 }
};
