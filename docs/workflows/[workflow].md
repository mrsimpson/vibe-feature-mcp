---
layout: false
---

<script setup>
import { useData } from 'vitepress'

const { params } = useData()
</script>

<WorkflowVisualizer :showSidebar="false" :hideHeader="true" :initialWorkflow="params.workflow" />