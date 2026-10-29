import {readCopy,saveCopy} from './offline';
const jobs=new Map();let globalJob=Promise.resolve();
export function noteSportsRevision(teamId,key,signature){const work=(jobs.get(teamId)||Promise.resolve()).catch(()=>{}).then(async()=>{const name='sports-revision.v1.'+teamId,old=(await readCopy(name))?.data||{signatures:{}};if(old.signatures?.[key]===signature)return;const changedAt=Math.max(Date.now(),(old.changedAt||0)+1),changes=[...(old.changes||[]),{id:key,at:changedAt}].slice(-50);await saveCopy(name,{changedAt,changes,signatures:{...old.signatures,[key]:signature}});globalJob=globalJob.catch(()=>{}).then(async()=>{const global=(await readCopy('sports-club-revision.v1'))?.data;await saveCopy('sports-club-revision.v1',{changedAt:Math.max(changedAt,(global?.changedAt||0)+1)})});await globalJob;}).finally(()=>{if(jobs.get(teamId)===work)jobs.delete(teamId)});jobs.set(teamId,work);return work}

const statJobs=new Map();
export function withSportsStats(teamId,work){const job=(statJobs.get(teamId)||Promise.resolve()).catch(()=>{}).then(work).finally(()=>{if(statJobs.get(teamId)===job)statJobs.delete(teamId)});statJobs.set(teamId,job);return job}
