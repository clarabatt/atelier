<script setup lang="ts">
import StatusChip, { type StatusChipVariant } from "@/components/ui/StatusChip.vue";
import { PipelineStatus } from "@/stores/applications";

const props = defineProps<{ status: string }>();

const config: Record<string, { text: string; variant: StatusChipVariant; loading?: boolean }> = {
  [PipelineStatus.READY]:     { text: "Ready",      variant: "success" },
  [PipelineStatus.FAILED]:    { text: "Failed",      variant: "error" },
  [PipelineStatus.ANALYZING]: { text: "Analyzing…",  variant: "info", loading: true },
  [PipelineStatus.UPLOADED]:  { text: "Uploaded",    variant: "default" },
};

function chipProps() {
  return config[props.status] ?? { text: props.status.replace(/_/g, " "), variant: "default" as StatusChipVariant };
}
</script>

<template>
  <StatusChip v-bind="chipProps()" />
</template>
