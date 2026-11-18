const {test}=require('node:test');
const assert=require('node:assert/strict');
const {ALLOWED_WEEKS,validateLoanProposal,validateLoanReturn}=require('./fantasy-loan-policy.cjs');
const valid={lenderUid:'a',borrowerUid:'b',lenderCount:14,borrowerCount:14,weeks:2,startsAt:1000,endsAt:2000};
test('duraciones admitidas y propuesta validada',()=>{assert.deepEqual(ALLOWED_WEEKS,[1,2,3,4]);assert.equal(validateLoanProposal(valid).weeks,2)});
test('impide prestar el último jugador obligatorio y superar cupo',()=>{
 assert.throws(()=>validateLoanProposal({...valid,lenderCount:12}),/12 jugadores/);
 assert.throws(()=>validateLoanProposal({...valid,borrowerCount:16}),/16 jugadores/);
});
test('rechaza otros equipos, operaciones incompatibles y ligas inactivas',()=>{
 assert.throws(()=>validateLoanProposal({...valid,borrowerUid:'a'}),/distintos/);
 assert.throws(()=>validateLoanProposal({...valid,playerListed:true}),/incompatible/);
 assert.throws(()=>validateLoanProposal({...valid,leagueActive:false}),/pausada/);
 assert.throws(()=>validateLoanProposal({...valid,weeks:5}),/1, 2, 3 o 4/);
});
test('comprueba que la devolución no deje a nadie por debajo de 12 ni encima de 16',()=>{
 const ret={currentHolderUid:'b',lenderUid:'a',borrowerUid:'b',borrowerCount:14,lenderCount:14,ownershipId:'own',expectedOwnershipId:'own'};
 assert.equal(validateLoanReturn(ret).returnTo,'a');
 assert.throws(()=>validateLoanReturn({...ret,borrowerCount:12}),/12 jugadores/);
 assert.throws(()=>validateLoanReturn({...ret,lenderCount:16}),/reservada una plaza/);
 assert.throws(()=>validateLoanReturn({...ret,expectedOwnershipId:'other'}),/propiedad/);
});

test('esquema D1 registra contratos pero impide activarlos prematuramente',()=>{
 const {DatabaseSync}=require('node:sqlite');
 const {readFileSync}=require('node:fs');
 const db=new DatabaseSync(':memory:');
 try{
  db.exec("CREATE TABLE fantasy_leagues(id TEXT PRIMARY KEY); CREATE TABLE fantasy_members(league_id TEXT,uid TEXT,PRIMARY KEY(league_id,uid)); INSERT INTO fantasy_leagues VALUES('l'); INSERT INTO fantasy_members VALUES('l','a'),('l','b');");
  db.exec(readFileSync('fantasy-loans-schema.sql','utf8'));
  db.prepare("INSERT INTO fantasy_player_loans(id,league_id,lender_uid,borrower_uid,ownership_id,player_id,duration_weeks,status,request_id,created_at,starts_at,ends_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)").run('x','l','a','b','own1','p1',2,'pending','key-00001',1000,2000,3000);
  assert.throws(()=>db.prepare("UPDATE fantasy_player_loans SET status='active' WHERE id='x'").run(),/FANTASY_LOAN_ACTIVATION_NOT_READY/);
  assert.throws(()=>db.prepare("INSERT INTO fantasy_player_loans(id,league_id,lender_uid,borrower_uid,ownership_id,player_id,duration_weeks,status,request_id,created_at,starts_at,ends_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)").run('y','l','a','b','own1','p1',2,'pending','key-00002',1000,2000,3000),/UNIQUE/);
  assert.equal(db.prepare("SELECT status FROM fantasy_player_loans WHERE id='x'").get().status,'pending');
 }finally{db.close()}
});
