import { BufferComposer, ComposableBuffer } from "../../buffer/buffer_composer";
import { Operation } from "./dftx";

// Disabling no-return-assign makes the code cleaner with the setter and getter */
/* eslint-disable no-return-assign */

export interface PoolSwap extends Operation {
  // var bw = new BufferWriter();
  //   bw.write(new Buffer(CUSTOM_SIGNATURE));
  //   bw.write(new Buffer(customTxType.poolSwap));
  //   bw = CScript.toBuffer(data.from, bw);
  //   bw.writeVarintNum(Number(data.idTokenFrom));
  //   bw.writeUInt64LEBN(BN.fromNumber(data.amountFrom * 100000000));
  //   bw = CScript.toBuffer(data.to, bw);
  //   bw.writeVarintNum(Number(data.idTokenTo));
  //   if (data.maxPrice) {
  //     bw.writeUInt64LEBN(BN.fromNumber(data.maxPrice / 100000000));
  //     bw.writeUInt64LEBN(BN.fromNumber(data.maxPrice % 100000000));
  //   } else {
  //     bw.writeUInt64LEBN(new BN(String(INT64_MAX)));
  //     bw.writeUInt64LEBN(new BN(String(INT64_MAX)));
  //   }
  //   return bw.toBuffer();
}

export class CPoolSwap extends ComposableBuffer<PoolSwap> {
  static TYPE = 0x73

  composers (data: PoolSwap): BufferComposer[] {
    return [];
  }
}

export interface PoolAddLiquidity extends Operation {

  // $.checkArgument(data, 'data is required');
  //   var bw = new BufferWriter();
  //   bw.write(new Buffer(CUSTOM_SIGNATURE));
  //   bw.write(new Buffer(customTxType.addPoolLiquidity));
  //   var size = Object.keys(data.from).length;
  //   bw.writeVarintNum(size);
  //   for (var entry of  Object.entries(data.from)) {
  //     bw = CScript.toBuffer(entry[0], bw);
  //     bw = new CBalances(entry[1], bw);
  //   }
  //   bw = CScript.toBuffer(data.shareAddress, bw);
  //   return bw.toBuffer();
}

export class CPoolAddLiquidity extends ComposableBuffer<PoolAddLiquidity> {
  static TYPE = 0x6c

  composers (data: PoolAddLiquidity): BufferComposer[] {
    return [];
  }

  // $.checkArgument(data, 'data is required');
  //   var bw = new BufferWriter();
  //   bw.write(new Buffer(CUSTOM_SIGNATURE));
  //   bw.write(new Buffer(customTxType.addPoolLiquidity));
  //   var size = Object.keys(data.from).length;
  //   bw.writeVarintNum(size);
  //   for (var entry of  Object.entries(data.from)) {
  //     bw = CScript.toBuffer(entry[0], bw);
  //     bw = new CBalances(entry[1], bw);
  //   }
  //   bw = CScript.toBuffer(data.shareAddress, bw);
  //   return bw.toBuffer();
}

export interface PoolRemoveLiquidity extends Operation {
//  $.checkArgument(data, 'data is required');
//   var bw = new BufferWriter();
//   bw.write(new Buffer(CUSTOM_SIGNATURE));
//   bw.write(new Buffer(customTxType.removePoolLiquidity));
//   bw = CScript.toBuffer(data.from, bw);
//   bw.writeVarintNum(data.nTokenId);
//   bw.writeUInt64LEBN(BN.fromNumber(data.nValue * 100000000));
//   return bw.toBuffer();
}

export class CPoolRemoveLiquidity extends ComposableBuffer<PoolRemoveLiquidity> {
  static TYPE = 0x72

  composers (data: PoolRemoveLiquidity): BufferComposer[] {
    return [];
  }
}


