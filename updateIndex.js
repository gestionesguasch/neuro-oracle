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

  // 3) Calcular inflación diaria a partir de INFLACION_ANUAL
  const inflacionAnual = Number(process.env.INFLACION_ANUAL); // ej. 0.052
  const inflacionDiaria = inflacionAnual / 365;
  console.log("Inflación diaria:", inflacionDiaria);

  // Factor diario (1 + inflacionDiaria)
  const factorDiario = 1 + inflacionDiaria;

  // 4) Calcular nuevo índice en BigInt
  // Escalamos el factor a 1e6 para no perder demasiada precisión
  const factorEscalado = BigInt(Math.round(factorDiario * 1e6)); // p.ej. 1000142
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
