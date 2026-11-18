'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const metaAds = require('../src/services/metaAds');

test('leady liczone z formularza natywnego Meta', () => {
  assert.equal(metaAds.liczLeady([{ action_type: 'link_click', value: '40' }, { action_type: 'lead', value: '3' }]), 3);
  assert.equal(metaAds.liczLeady([{ action_type: 'onsite_conversion.lead_grouped', value: '2' }]), 2);
  assert.equal(metaAds.liczLeady(undefined), 0);
});

test('wiersz liczy koszt leada i nie dzieli przez zero', () => {
  const w = metaAds.wiersz({ spend: '120.50', impressions: '4000', actions: [{ action_type: 'lead', value: '2' }] });
  assert.equal(w.wydane, 120.5);
  assert.equal(w.kosztLeada, 60.25);
  assert.equal(metaAds.wiersz({ spend: '50' }).kosztLeada, null);
});

test('tempo budżetu w trakcie kampanii', () => {
  const t = metaAds.tempo({ budzet: 1500, start: '2026-11-18', koniec: '2026-12-01' }, 300, new Date('2026-11-21T12:00:00'));
  assert.equal(t.minelo, 4);
  assert.equal(t.zostaloBudzetu, 1200);
  assert.equal(t.procentBudzetu, 20);
  assert.ok(t.zostaloDni >= 10 && t.zostaloDni <= 11);
});

test('bez tokenu zwraca ustawienia kampanii zamiast błędu', async () => {
  delete process.env.META_ACCESS_TOKEN;
  const d = await metaAds.pobierz();
  assert.equal(d.polaczono, false);
  assert.equal(d.budzet, 1500);
  assert.equal(d.campaignId, '120253743872800392');
});

test('lead z formularza: dane kontaktowe i odpowiedzi na pytania', () => {
  const l = metaAds.lead({
    id: '1', created_time: '2026-11-19T10:00:00+0000',
    field_data: [
      { name: 'full_name', values: ['Anna Nowak'] },
      { name: 'email', values: ['anna@studio.pl'] },
      { name: 'phone_number', values: ['+48600100200'] },
      { name: 'website', values: ['instagram.com/annastudio'] },
      { name: 'czym_się_zajmujesz?', values: ['Projektowanie wnętrz'] },
      { name: 'czy_masz_dziś_stronę_www?', values: ['Mam, ale do zmiany'] },
    ],
  }, '21P_V02_DARMOWA_KONCEPCJA');
  assert.equal(l.imie, 'Anna Nowak');
  assert.equal(l.telefon, '+48600100200');
  assert.equal(l.email, 'anna@studio.pl');
  assert.equal(l.strona, 'instagram.com/annastudio');
  assert.equal(l.zawod, 'Projektowanie wnętrz');
  assert.equal(l.maStrone, 'Mam, ale do zmiany');
  assert.deepEqual(l.inne, []);
  assert.equal(l.reklama, '21P_V02_DARMOWA_KONCEPCJA');
});
