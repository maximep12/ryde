# How to install cert manager with Helm

Make sure you are in the right kube context.

## Step 1. Install Cert Manager

```bash
helm install \
  cert-manager oci://quay.io/jetstack/charts/cert-manager \
  --version v1.19.0 \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true
  # crds.enabled MUST be at true to allow CertManager to install custom resource definitions in a kube cluster
```

## Step 2. Create the cluster issuer

```bash
kubectl apply -f infra/cluster-issuer.yaml
```
