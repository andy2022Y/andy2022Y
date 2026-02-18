#!/usr/bin/env python3
"""Mini game aleatório: adivinhe o número."""

from __future__ import annotations

import argparse
import random


def jogar(seed: int | None = None) -> None:
    rng = random.Random(seed)
    print("🎮 Mini game: Adivinhe o número de 1 a 10!")

    while True:
        segredo = rng.randint(1, 10)
        tentativas = 3

        while tentativas > 0:
            entrada = input(f"Tentativa ({tentativas}): ").strip()

            if not entrada.isdigit() or not 1 <= int(entrada) <= 10:
                print("Digite um número inteiro entre 1 e 10.")
                continue

            chute = int(entrada)
            if chute == segredo:
                print("✅ Acertou! Você venceu esta rodada.")
                break

            tentativas -= 1
            if tentativas > 0:
                dica = "maior" if chute < segredo else "menor"
                print(f"❌ Errou! O número secreto é {dica} que {chute}.")
            else:
                print(f"💀 Fim de jogo! O número era {segredo}.")

        novamente = input("Quer jogar de novo? (s/n): ").strip().lower()
        if novamente != "s":
            print("👋 Valeu por jogar!")
            return


def main() -> None:
    parser = argparse.ArgumentParser(description="Mini game aleatório para teste")
    parser.add_argument("--seed", type=int, default=None, help="Semente opcional para teste")
    args = parser.parse_args()
    jogar(seed=args.seed)


if __name__ == "__main__":
    main()
