export function countDeep(groups){
  let deep = 0, total = 0;
  for(const g of groups){
    for(const it of g.items){
      total++;
      if(it.details || (it.examples && it.examples.length) || it.tutorial) deep++;
    }
  }
  return { deep, total };
}
