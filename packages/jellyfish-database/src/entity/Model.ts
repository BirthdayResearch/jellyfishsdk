import { Column, Entity, Index, ManyToOne, OneToMany, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
export class Block {
  @PrimaryColumn()
  hash: string

  @Column()
  height: number

  @OneToMany(type => Transaction, txn => txn.block)
  transactions: Transaction[]
}

@Entity()
export class Transaction {
  @PrimaryColumn()
  txid: string

  @ManyToOne(type => Block, block => block.transactions)
  block: Block

  @OneToMany(type => TransactionVin, vin => vin.transaction)
  vins: TransactionVin[]

  @OneToMany(type => TransactionVout, vout => vout.transaction)
  vouts: TransactionVout[]
}

@Entity()
export class TransactionVin {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  @Index()
  n: number

  @ManyToOne(type => Transaction, txn => txn.vins)
  transaction: Transaction

  vout?: TransactionVout
}

@Entity()
export class TransactionVout {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  @Index()
  n: number

  @ManyToOne(type => Transaction, txn => txn.vins)
  transaction: Transaction

  vin?: TransactionVin
}
