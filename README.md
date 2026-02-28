# RPG 2D Top-Down (HTML + Canvas + JS)

Jogo RPG 2D sem dependências externas, com:

- Movimento em 8 direções (WASD / setas)
- Combate com 3 modos: melee, ranged, magic
- Inimigos com IA simples (aggro + perseguição)
- Loot de gold e poções
- Inventário básico
- Quests:
  - Q1: matar rats
  - Q2: coletar herbs
  - Q3: entregar carta
- NPCs no HUB (Elder, Merchant, Blacksmith), incluindo loja
- Autosave a cada 20 segundos + save manual no botão
- Minimap
- Terreno sem grid visível

## Como rodar

Na raiz do projeto:

```bash
python3 -m http.server 8080
```

Abra `http://localhost:8080` no navegador.

## Controles

- **Movimento:** WASD ou setas
- **Ataque:** clique do mouse
- **Modo de combate:** 1 (melee), 2 (ranged), 3 (magic)
- **Inventário:** I
- **Interagir/loja:** E
- **Usar poção:** F
- **Salvar manual:** botão "Salvar"

## Observações

- Save é persistido em `localStorage`.
- Ao morrer, o player respawna no HUB.
