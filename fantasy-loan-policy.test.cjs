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
