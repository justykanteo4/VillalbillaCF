export async function economyPolicy(db){const row=await db.prepare('SELECT settings_json,revision FROM fantasy_economy_policy WHERE id=1').first();return {...JSON.parse(row.settings_json),revision:row.revision}}
export function weeklyCredit(settings,week){const change=settings.weeklyChange;return change&&week>=change.fromWeek?change.weeklyIncomeCents:200}
