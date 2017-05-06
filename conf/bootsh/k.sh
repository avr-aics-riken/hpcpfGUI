#!/bin/sh
#PJM --rsc-list "node=JOB.NODE"
#PJM --mpi "proc=JOB.PROC"
#PJM --rsc-list "rscgrp=micro"
#PJM --rsc-list "elapse=00:28:00"
#PJM -S
export OMP_NUM_THREADS=JOB.THREADS
JOB.OPTION
sh JOB.JOB

