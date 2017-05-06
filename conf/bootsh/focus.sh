#!/bin/bash
#SBATCH -p ye001uta3m
#SBATCH -N JOB.NODE
#SBATCH -n JOB.CORE
#SBATCH -J JOB.NAME
#SBATCH -o stdout.%J.log
#SBATCH -e stderr.%J.log
JOB.OPTION
sh JOB.JOB

