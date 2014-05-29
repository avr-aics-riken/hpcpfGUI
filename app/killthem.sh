#!/bin/bash

parent=$1
echo "Listup children of "$parent

pidlist=($parent)
target=($parent)

while [ "$target" != "" ]
do
        child=`ps -eo pid,ppid | awk '$2 == "'"$target"'" { print $1 }'`

        if [ -n "$child" ]; then
            pidlist=("${pidlist[@]}" $child)
        fi
        target=$child
done

for (( j = 0; j < ${#pidlist[@]}; ++j ))
do
        echo "child "$j":"${pidlist[$j]}
        echo "KILL! "${pidlist[$j]}
        kill ${pidlist[$j]}
done
