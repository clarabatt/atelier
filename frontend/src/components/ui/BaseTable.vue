<template>
  <div class="base-table-wrap">
    <table class="base-table">
      <slot />
    </table>
  </div>
</template>

<style lang="scss" scoped>
.base-table-wrap {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  width: 100%;
}

.base-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

:slotted(thead tr) {
  background: var(--color-bg-subtle);
}

:slotted(th) {
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
  padding: 9px 12px;
  border-bottom: 1px solid var(--color-border);
}

:slotted(td) {
  padding: 9px 12px;
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
  color: var(--color-text);
}

:slotted(tbody tr:last-child td) {
  border-bottom: none;
}
</style>
