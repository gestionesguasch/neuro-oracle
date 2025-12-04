require("dotenv").config();
const { ethers } = require("ethers");
const abi = require("./abi.json");

async function main() {
  // 1) Conectar a Sepolia
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, wallet);

  console.log("Oracle address:", await wallet.getAddress());

  // 2) Leer índice actual
  const oldIndex = await contract.priceIndex();
  console.log("priceIndex actual:", oldIndex.toString());

  // 3) Calcular factor por intervalo a partir de INFLACION_ANUAL
  //    Si no se define INFLACION_ANUAL en .env, usamos por defecto 0.022 (2,2%)
  const inflacionAnual = Number(
    process.env.INFLACION_ANUAL !== undefined
      ? process.env.INFLACION_ANUAL
      : 0.022
  ); // 2.2% anual

  // Asumimos que este script se ejecuta cada 10 minutos.
  //  - 60 / 10 = 6 intervalos por hora
  //  - 24 * 6 = 144 intervalos por día
  //  - 365 * 144 = 52.560 intervalos por año
  const intervalosPorHora = 60 / 10; // cada 10 minutos
  const intervalosPorDia = 24 * intervalosPorHora;
  const intervalosPorAnio = 365 * intervalosPorDia;

  // Factor de crecimiento por intervalo (compuesto):
  // (1 + inflacionAnual)^(1 / intervalosPorAnio)
  const factorPorIntervalo = Math.pow(1 + inflacionAnual, 1 / intervalosPorAnio);
  console.log("Factor por intervalo:", factorPorIntervalo);

  // 4) Calcular nuevo índice en BigInt
  // Escalamos el factor a 1e6 para no perder demasiada precisión
  const factorEscalado = BigInt(Math.round(factorPorIntervalo * 1e6));
  const newIndex = (oldIndex * factorEscalado) / BigInt(1e6);

  console.log("Nuevo índice:", newIndex.toString());

  // 5) Enviar transacción updateIndex
  const tx = await contract.updateIndex(newIndex);
  console.log("TX enviada:", tx.hash);

  const receipt = await tx.wait();
  console.log("TX confirmada en bloque:", receipt.blockNumber);
}

main().catch((err) => {
  console.error("Error:", err);
});
