# Argo CD (Continuous Delivery)

`application.yaml` is the Argo CD **Application** that deploys this repo's `k8s/` manifests into the
`earthquake` namespace using a pull-based GitOps model. Argo CD runs inside the cluster and watches
`main`; CI pins each image to its commit SHA and commits it back, which is what Argo CD rolls out.

See the [Continuous Delivery](../README.md#continuous-delivery-argo-cd) section of the root README for
the full bootstrap steps and the push → deploy loop.
