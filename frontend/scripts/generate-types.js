const { runTypeChain, glob } = require('typechain');

async function main() {
  const cwd = process.cwd();
  const files = await glob(cwd, [`./src/contracts/*.json`]);

  await runTypeChain({
    cwd,
    filesToProcess: files,
    allFiles: files,
    outDir: './src/contracts/typechain',
    target: 'ethers-v6',
  });
}

main().catch(console.error); 