const test=require('node:test'),assert=require('node:assert/strict'),S=require('../sol-core');

const MADRID=[40.4168,-3.7038];
// Minutos entre lo calculado y lo publicado: la aproximacion se equivoca en un par de minutos.
const cerca=(ms,iso,margen=4)=>Math.abs(ms-Date.parse(iso))/60000<=margen;

test('salida y puesta en Madrid, en los dos solsticios',()=>{
 const junio=S.sunTimes('2026-06-21T12:00:00Z',...MADRID);
 assert.ok(cerca(junio.rise,'2026-06-21T04:44:00Z'),'sale a las 6:44 hora de verano');
 assert.ok(cerca(junio.set,'2026-06-21T19:48:00Z'),'se pone a las 21:48');
 const diciembre=S.sunTimes('2026-12-21T12:00:00Z',...MADRID);
 assert.ok(cerca(diciembre.rise,'2026-12-21T07:33:00Z'),'sale a las 8:33 hora de invierno');
 assert.ok(cerca(diciembre.set,'2026-12-21T16:51:00Z'),'se pone a las 17:51');
});

test('mas al este, el sol sale antes',()=>{
 const bcn=S.sunTimes('2026-06-21T12:00:00Z',41.3874,2.1686),mad=S.sunTimes('2026-06-21T12:00:00Z',...MADRID);
 assert.ok(cerca(bcn.rise,'2026-06-21T04:18:00Z'));
 assert.ok(bcn.rise<mad.rise&&bcn.set<mad.set);
});

test('de noche es de noche: antes de salir y despues de ponerse',()=>{
 assert.equal(S.isNight('2026-06-21T23:30:00+02:00',...MADRID),true);
 assert.equal(S.isNight('2026-06-22T03:00:00+02:00',...MADRID),true,'de madrugada, que es cuando se recoge');
 assert.equal(S.isNight('2026-06-21T14:00:00+02:00',...MADRID),false);
 assert.equal(S.isNight('2026-12-21T08:00:00+01:00',...MADRID),true,'en invierno a las ocho aun es de noche');
 assert.equal(S.isNight('2026-12-21T09:00:00+01:00',...MADRID),false);
});

test('la medianoche de Greenwich no parte la noche en dos',()=>{
 // 00:30 UTC es la misma noche, aunque en Greenwich ya sea otro dia.
 assert.equal(S.isNight('2026-06-22T00:30:00Z',...MADRID),true);
 assert.equal(S.isNight('2026-06-21T23:59:00Z',...MADRID),true);
});

test('donde el sol no sale o no se pone, se dice',()=>{
 assert.deepEqual(S.sunTimes('2026-06-21T12:00:00Z',69.65,18.96),{polar:'dia'});
 assert.deepEqual(S.sunTimes('2026-12-21T12:00:00Z',69.65,18.96),{polar:'noche'});
 assert.equal(S.isNight('2026-06-21T23:00:00Z',69.65,18.96),false,'sol de medianoche');
 assert.equal(S.isNight('2026-12-21T12:00:00Z',69.65,18.96),true,'noche polar');
});

test('sin datos no se inventa la noche',()=>{
 assert.equal(S.sunTimes('x',...MADRID),null);
 assert.equal(S.sunTimes('2026-06-21T12:00:00Z',NaN,-3.7),null);
 assert.equal(S.sunTimes('2026-06-21T12:00:00Z',40.4,undefined),null);
 assert.equal(S.sunTimes('2026-06-21T12:00:00Z',120,0),null);
 assert.equal(S.isNight('x',...MADRID),false);
});
