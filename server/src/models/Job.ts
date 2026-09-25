import { EventEmitter } from 'events';

export type JobStatus = 'queued' | 'cloning' | 'scanning' | 'building_graph' | 'done' | 'error';

export interface IJob {
  id: string;
  repoUrl: string;
  status: JobStatus;
  progress: number;
  message: string;
  error?: string;
  analysisId?: string;
  createdAt: Date;
  updatedAt: Date;
}

class JobManager extends EventEmitter {
  private jobs: Map<string, IJob> = new Map();

  createJob(id: string, repoUrl: string): IJob {
    const job: IJob = {
      id,
      repoUrl,
      status: 'queued',
      progress: 0,
      message: 'Job queued...',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.jobs.set(id, job);
    this.emit(`update:${id}`, job);
    this.cleanupOldJobs();
    return job;
  }

  getJob(id: string): IJob | undefined {
    return this.jobs.get(id);
  }

  updateJob(id: string, updates: Partial<Omit<IJob, 'id' | 'repoUrl' | 'createdAt'>>): IJob | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;

    Object.assign(job, updates, { updatedAt: new Date() });
    this.jobs.set(id, job);
    this.emit(`update:${id}`, job);
    return job;
  }

  private cleanupOldJobs(): void {
    const ONE_HOUR = 60 * 60 * 1000;
    const now = Date.now();
    for (const [id, job] of this.jobs.entries()) {
      if (now - job.createdAt.getTime() > ONE_HOUR) {
        this.jobs.delete(id);
      }
    }
  }
}

export const jobManager = new JobManager();
