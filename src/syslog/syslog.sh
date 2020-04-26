#!/bin/bash
# 0 -> null

ARR=();

#cpu
if [ "$1" == "1" ] || [ "$1" == "3" ] || [ "$1" == "5" ] || [ "$1" == "7" ] || [ "$1" == "9" ] || [ "$1" == "11" ] || [ "$1" == "13" ] || [ "$1" == "15" ]; then
  cpu=`top -l1|grep usage|cut -d' ' -f3|tr -d '%'|tr -d '\n'`
  cpu=`echo $cpu | awk '{printf("%d",$1 + 0.5)}'`
  ARR+=($cpu)
fi

# memory
if [ "$1" == "2" ] || [ "$1" == "3" ] || [ "$1" == "6" ] || [ "$1" == "7" ] || [ "$1" == "10" ] || [ "$1" == "11" ] || [ "$1" == "14" ] || [ "$1" == "15" ]; then
  free=`vm_stat|grep "Pages free"|sed 's/Pages free:.* //'|sed 's/\.//'`
  wired=`vm_stat|grep "Pages wired"|sed 's/Pages wired down:.* //'|sed 's/\.//'`
  active=`vm_stat|grep "Pages active"|sed 's/Pages active:.* //'|sed 's/\.//'`
  inactive=`vm_stat|grep "Pages inactive"|sed 's/Pages inactive:.* //'|sed 's/\.//'`
  speculative=`vm_stat|grep "Pages speculative"|sed 's/Pages speculative:.* //'|sed 's/\.//'`
  compressor=`vm_stat|grep "Pages occupied by compressor"|sed 's/Pages occupied by compressor:.* //'|sed 's/\.//'`
  purgeable=`vm_stat|grep "Pages purgeable"|sed 's/Pages purgeable:.* //'|sed 's/\.//'`
  filebacked=`vm_stat|grep "File-backed pages:"|sed 's/File-backed pages:.* //'|sed 's/\.//'`
  sum=`echo "scale=2; $wired + $active" |bc`
  total=`echo "scale=2; $free + $active + $inactive + $speculative + $wired" |bc`
  mem=`echo "scale=2; $sum * 100 / $total" |bc`
  mem=`echo $mem | awk '{printf("%d",$1 + 0.5)}'`
  ARR+=($mem)
fi

# battery
if [ "$1" == "4" ] || [ "$1" == "5" ] || [ "$1" == "6" ] || [ "$1" == "7" ] || [ "$1" == "12" ] || [ "$1" == "13" ] || [ "$1" == "14" ] || [ "$1" == "15" ]; then
  cap=`ioreg -l | grep Capacity`
  full=`echo $cap | sed -e "s/^.*MaxCapacity\" = \([0-9]*\).*/\1/"`
  curr=`echo $cap | sed -e "s/^.*CurrentCapacity\" = \([0-9]*\).*/\1/"`
  pct=`echo "scale=4; $curr / $full * 100" | bc`
  bat=`printf "%.2f%%\n" $pct|sed 's/%//g'`
  bat=`echo $bat | awk '{printf("%d",$1 + 0.5)}'`
  ARR+=($bat)
fi

# network
# bef=`top -l1|grep "Networks"|sed 's/Networks: packets: //'|sed 's/\/.* in.*//'`
# aft=`top -l1|grep "Networks"|sed 's/Networks: packets: //'|sed 's/\/.* in.*//'`
# echo "$bef"
# echo "$aft"

# temp
if  [ "$1" == "8" ] || [ "$1" == "9" ] || [ "$1" == "10" ] || [ "$1" == "11" ] || [ "$1" == "12" ] || [ "$1" == "13" ] || [ "$1" == "14" ] || [ "$1" == "15" ]; then
  temp=`sysctl machdep.xcpm.cpu_thermal_level|sed "s/machdep.xcpm.cpu_thermal_level://"`
  ARR+=($temp)
fi

ARR=`echo -n "${ARR[@]}"|sed 's/ /,/g'`

echo -n "$1,$ARR"
